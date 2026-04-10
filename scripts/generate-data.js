/**
 * generate-data.js
 * 從 Supabase 資料庫抓取品牌與產品資料，產生 data.js 檔案
 *
 * 用法：
 *   node scripts/generate-data.js
 *
 * 此腳本會在每次 Vercel build 時自動執行，
 * 也可以手動執行來預覽產生的 data.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// 從環境變數讀取（Vercel 上會自動注入）
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log("🔄 Fetching brands from Supabase...");

  // 1. 抓取所有品牌
  const { data: brands, error: brandsError } = await supabase
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (brandsError) {
    console.error("Error fetching brands:", brandsError);
    process.exit(1);
  }

  console.log(`  ✅ ${brands.length} brands loaded`);

  // 2. 抓取所有產品（分批，Supabase 單次上限 1000）
  let allProducts = [];
  let page = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("brand_id")
      .order("id")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (productsError) {
      console.error("Error fetching products:", productsError);
      process.exit(1);
    }

    allProducts = allProducts.concat(products);
    console.log(`  📦 Page ${page + 1}: ${products.length} products`);

    if (products.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`  ✅ ${allProducts.length} total products loaded`);

  // 3. 抓取所有尺寸
  console.log("🔄 Fetching sizes...");
  let allSizes = [];
  page = 0;

  while (true) {
    const { data: sizes, error } = await supabase
      .from("product_sizes")
      .select("*")
      .order("product_id")
      .order("sort_order")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching sizes:", error);
      process.exit(1);
    }

    allSizes = allSizes.concat(sizes);
    if (sizes.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`  ✅ ${allSizes.length} sizes loaded`);

  // 4. 抓取所有圖片
  console.log("🔄 Fetching gallery images...");
  let allGallery = [];
  page = 0;

  while (true) {
    const { data: gallery, error } = await supabase
      .from("product_gallery")
      .select("*")
      .order("product_id")
      .order("sort_order")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching gallery:", error);
      process.exit(1);
    }

    allGallery = allGallery.concat(gallery);
    if (gallery.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`  ✅ ${allGallery.length} gallery images loaded`);

  // 5. 建立索引 (以 product_id 分組)
  const sizesByProduct = {};
  allSizes.forEach((s) => {
    if (!sizesByProduct[s.product_id]) sizesByProduct[s.product_id] = [];
    sizesByProduct[s.product_id].push({
      label: s.label,
      available: s.available,
    });
  });

  const galleryByProduct = {};
  allGallery.forEach((g) => {
    if (!galleryByProduct[g.product_id]) galleryByProduct[g.product_id] = [];
    galleryByProduct[g.product_id].push({
      type: g.type,
      url: g.url,
      original_url: g.original_url,
    });
  });

  // 6. 組裝成原始 data.js 格式
  const brandsData = brands.map((b) => ({
    id: b.id,
    name: b.name,
    style: b.style || "",
    color_hex: b.color_hex || "#0a0a1a",
    description: {
      en: b.description_en || "",
      th: b.description_th || "",
      zh: b.description_zh || "",
    },
    meta: {
      category: b.category || "",
      website: b.website || "",
      founded: b.founded || "",
      location: b.location || "",
    },
  }));

  const productsData = allProducts.map((p) => {
    const product = {
      id: p.id,
      brand_id: p.brand_id,
      name: p.name,
    };

    if (p.tag) product.tag = p.tag;
    if (p.category) product.category = p.category;
    if (p.season) product.season = p.season;

    // 價格
    product.price = {};
    if (p.price_vnd) product.price.vnd = p.price_vnd;
    if (p.price_vnd_estimated) product.price.vnd_estimated = p.price_vnd_estimated;
    if (p.price_thb_shipping) product.price.thb_shipping = p.price_thb_shipping;
    if (p.price_thb_carryback) product.price.thb_carryback = p.price_thb_carryback;
    if (p.price_note) product.price.note = p.price_note;

    // 尺寸
    product.sizes = sizesByProduct[p.id] || [];

    // 圖片
    product.images = {
      cover: p.cover_image || "",
      gallery: galleryByProduct[p.id] || [],
    };

    product.sold_out = p.sold_out || false;
    product.needs_review = p.needs_review || false;

    if (p.original_cover_url) {
      product.original_cover_url = p.original_cover_url;
    }

    return product;
  });

  const output = {
    brands: brandsData,
    products: productsData,
  };

  // 7. 寫入 data.js
  const outputPath = path.resolve(
    process.env.DATA_OUTPUT_PATH || "./public/data.js"
  );
  const content = `window.BRANDS_DATA = ${JSON.stringify(output)};`;

  // 確保目錄存在
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content, "utf-8");

  const sizeMB = (Buffer.byteLength(content) / 1024 / 1024).toFixed(2);
  console.log(`\n✅ data.js generated successfully!`);
  console.log(`   📍 Path: ${outputPath}`);
  console.log(`   📊 ${brandsData.length} brands, ${productsData.length} products`);
  console.log(`   💾 File size: ${sizeMB} MB`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
