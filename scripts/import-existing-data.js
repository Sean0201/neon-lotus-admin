/**
 * import-existing-data.js
 * 將你現有的 data.js 匯入到 Supabase 資料庫
 *
 * 用法：
 *   node scripts/import-existing-data.js ./path/to/data.js
 *
 * ⚠️ 這個腳本只需要執行一次，用來做初始資料遷移
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("Please set them in .env or as environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BATCH_SIZE = 500; // Supabase 建議的批次大小

async function insertBatch(table, rows) {
  const { error } = await supabase.from(table).upsert(rows, {
    onConflict: "id",
    ignoreDuplicates: false,
  });
  if (error) {
    console.error(`Error inserting into ${table}:`, error.message);
    throw error;
  }
}

async function main() {
  const dataPath = process.argv[2];
  if (!dataPath) {
    console.error("Usage: node import-existing-data.js <path-to-data.js>");
    process.exit(1);
  }

  console.log(`📂 Reading ${dataPath}...`);
  const fileContent = fs.readFileSync(path.resolve(dataPath), "utf-8");

  // 模擬 window 物件來解析 data.js
  const window = {};
  const script = new vm.Script(fileContent);
  const context = vm.createContext({ window });
  script.runInContext(context);

  const data = window.BRANDS_DATA;
  if (!data) {
    console.error("Error: Could not find window.BRANDS_DATA in file.");
    process.exit(1);
  }

  console.log(
    `📊 Found ${data.brands.length} brands, ${data.products.length} products\n`
  );

  // ========== 匯入品牌 ==========
  console.log("🔄 Importing brands...");
  const brandRows = data.brands.map((b, i) => ({
    id: b.id,
    name: b.name,
    style: b.style || null,
    color_hex: b.color_hex || "#0a0a1a",
    description_en: b.description?.en || null,
    description_th: b.description?.th || null,
    description_zh: b.description?.zh || null,
    category: b.meta?.category || null,
    website: b.meta?.website || null,
    founded: b.meta?.founded || null,
    location: b.meta?.location || null,
    is_active: true,
    sort_order: i,
  }));

  await insertBatch("brands", brandRows);
  console.log(`  ✅ ${brandRows.length} brands imported\n`);

  // ========== 匯入產品 ==========
  console.log("🔄 Importing products...");
  const productRows = data.products.map((p, i) => ({
    id: p.id,
    brand_id: p.brand_id,
    name: p.name,
    tag: p.tag || null,
    category: p.category || null,
    season: p.season || null,
    price_vnd: p.price?.vnd || null,
    price_vnd_estimated: p.price?.vnd_estimated || null,
    price_thb_shipping: p.price?.thb_shipping || null,
    price_thb_carryback: p.price?.thb_carryback || null,
    price_note: p.price?.note || null,
    cover_image: p.images?.cover || null,
    original_cover_url: p.original_cover_url || null,
    sold_out: p.sold_out || false,
    needs_review: p.needs_review || false,
    is_active: true,
    sort_order: i,
  }));

  // 分批匯入產品
  for (let i = 0; i < productRows.length; i += BATCH_SIZE) {
    const batch = productRows.slice(i, i + BATCH_SIZE);
    await insertBatch("products", batch);
    console.log(
      `  📦 ${Math.min(i + BATCH_SIZE, productRows.length)}/${productRows.length} products...`
    );
  }
  console.log(`  ✅ ${productRows.length} products imported\n`);

  // ========== 匯入尺寸 ==========
  console.log("🔄 Importing product sizes...");
  const sizeRows = [];
  data.products.forEach((p) => {
    if (p.sizes && Array.isArray(p.sizes)) {
      p.sizes.forEach((s, i) => {
        sizeRows.push({
          product_id: p.id,
          label: s.label,
          available: s.available !== false,
          sort_order: i,
        });
      });
    }
  });

  for (let i = 0; i < sizeRows.length; i += BATCH_SIZE) {
    const batch = sizeRows.slice(i, i + BATCH_SIZE);
    // sizes 沒有自定義 id，使用 insert 而非 upsert
    const { error } = await supabase.from("product_sizes").insert(batch);
    if (error) {
      console.error(`Error inserting sizes batch:`, error.message);
      // 繼續下一批
    }
    console.log(
      `  📏 ${Math.min(i + BATCH_SIZE, sizeRows.length)}/${sizeRows.length} sizes...`
    );
  }
  console.log(`  ✅ ${sizeRows.length} sizes imported\n`);

  // ========== 匯入圖片庫 ==========
  console.log("🔄 Importing product gallery...");
  const galleryRows = [];
  data.products.forEach((p) => {
    if (p.images?.gallery && Array.isArray(p.images.gallery)) {
      p.images.gallery.forEach((img, i) => {
        galleryRows.push({
          product_id: p.id,
          type: img.type || "detail",
          url: img.url,
          original_url: img.original_url || img.url,
          sort_order: i,
        });
      });
    }
  });

  for (let i = 0; i < galleryRows.length; i += BATCH_SIZE) {
    const batch = galleryRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("product_gallery").insert(batch);
    if (error) {
      console.error(`Error inserting gallery batch:`, error.message);
    }
    console.log(
      `  🖼️  ${Math.min(i + BATCH_SIZE, galleryRows.length)}/${galleryRows.length} images...`
    );
  }
  console.log(`  ✅ ${galleryRows.length} gallery images imported\n`);

  // ========== 完成 ==========
  console.log("🎉 Import complete!");
  console.log(`   Brands:   ${brandRows.length}`);
  console.log(`   Products: ${productRows.length}`);
  console.log(`   Sizes:    ${sizeRows.length}`);
  console.log(`   Gallery:  ${galleryRows.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
