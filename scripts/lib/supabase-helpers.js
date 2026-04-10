/**
 * Supabase 資料庫操作工具
 * 提供品牌、產品、尺寸、圖片的 CRUD 操作
 */
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function upsertBrand(brand) {
  const row = {
    id: brand.id, name: brand.name, style: brand.style || "",
    color_hex: brand.color_hex || "#0a0a1a", category: brand.category || "",
    website: brand.website || "", founded: brand.founded || "",
    location: brand.location || "", description_en: brand.description_en || "",
    description_th: brand.description_th || "", description_zh: brand.description_zh || "",
    sort_order: brand.sort_order ?? 999, is_active: true,
  };
  const { error } = await supabase.from("brands").upsert(row, { onConflict: "id" });
  if (error) throw new Error("Brand upsert failed: " + error.message);
  console.log("Brand updated: " + brand.name + " (" + brand.id + ")");
}

async function upsertProducts(brandId, products) {
  const BATCH = 200;
  let created = 0;

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const rows = batch.map((p, idx) => ({
      id: p.id || brandId + "-" + String(i + idx + 1).padStart(3, "0"),
      brand_id: brandId, name: p.name || "", tag: p.tag || "",
      category: p.category || "", season: p.season || "",
      price_vnd: p.price_vnd || null, price_vnd_estimated: p.price_vnd_estimated || null,
      price_thb_shipping: p.price_thb_shipping || null,
      price_thb_carryback: p.price_thb_carryback || null,
      price_note: p.price_note || "", cover_image: p.cover_image || "",
      original_cover_url: p.original_cover_url || "",
      sold_out: p.sold_out || false, needs_review: p.needs_review ?? true,
      is_active: true,
    }));
    const { error } = await supabase.from("products").upsert(rows, { onConflict: "id" });
    if (error) throw new Error("Product upsert failed (batch " + i + "): " + error.message);
    created += rows.length;
  }
  console.log(created + " products written (brand: " + brandId + ")");

  // Process sizes
  const sizesData = [];
  const galleryData = [];

  for (const p of products) {
    const pid = p.id || brandId + "-" + String(products.indexOf(p) + 1).padStart(3, "0");

    if (p.sizes && p.sizes.length > 0) {
      p.sizes.forEach((s, idx) => {
        sizesData.push({
          product_id: pid, label: s.label || s,
          available: s.available !== undefined ? s.available : true, sort_order: idx,
        });
      });
    }

    if (p.gallery && p.gallery.length > 0) {
      p.gallery.forEach((g, idx) => {
        galleryData.push({
          product_id: pid,
          url: typeof g === "string" ? g : g.url,
          original_url: typeof g === "string" ? g : (g.original_url || g.url),
          type: typeof g === "string" ? "image" : (g.type || "image"),
          sort_order: idx,
        });
      });
    }
  }

  if (sizesData.length > 0) {
    const productIds = [...new Set(sizesData.map(s => s.product_id))];
    await supabase.from("product_sizes").delete().in("product_id", productIds);
    for (let i = 0; i < sizesData.length; i += BATCH) {
      const batch = sizesData.slice(i, i + BATCH);
      const { error } = await supabase.from("product_sizes").insert(batch);
      if (error) console.warn("Sizes warning: " + error.message);
    }
    console.log(sizesData.length + " sizes written");
  }

  if (galleryData.length > 0) {
    const productIds = [...new Set(galleryData.map(g => g.product_id))];
    await supabase.from("product_gallery").delete().in("product_id", productIds);
    for (let i = 0; i < galleryData.length; i += BATCH) {
      const batch = galleryData.slice(i, i + BATCH);
      const { error } = await supabase.from("product_gallery").insert(batch);
      if (error) console.warn("Gallery warning: " + error.message);
    }
    console.log(galleryData.length + " gallery images written");
  }
}

async function getProductCount(brandId) {
  const { count } = await supabase.from("products")
    .select("id", { count: "exact", head: true }).eq("brand_id", brandId);
  return count || 0;
}

async function getProductIds(brandId) {
  const { data } = await supabase.from("products")
    .select("id").eq("brand_id", brandId).order("id");
  return (data || []).map(p => p.id);
}

async function getNextProductNumber(brandId) {
  return (await getProductCount(brandId)) + 1;
}

async function triggerDeploy(target) {
  const hooks = {
    zh: process.env.VERCEL_DEPLOY_HOOK_ZH,
    th: process.env.VERCEL_DEPLOY_HOOK_TH,
  };
  const targets = target === "all" ? ["zh", "th"] : [target];
  for (const t of targets) {
    if (!hooks[t]) { console.warn("No deploy hook for " + t); continue; }
    const res = await fetch(hooks[t], { method: "POST" });
    console.log(t + " deploy: " + (res.ok ? "triggered" : "failed " + res.status));
  }
}

module.exports = {
  supabase, upsertBrand, upsertProducts,
  getProductCount, getProductIds, getNextProductNumber, triggerDeploy,
};
