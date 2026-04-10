#!/usr/bin/env node
/**
 * 品牌爬蟲模板
 *
 * 用法：
 *   node scripts/scrape-brand.js <brand-id> <url> [--pages=N] [--deploy]
 *
 * 範例：
 *   node scripts/scrape-brand.js blish "https://blish.vn/collections/all"
 *   node scripts/scrape-brand.js blish "https://blish.vn/collections/all" --pages=5
 *   node scripts/scrape-brand.js blish "https://blish.vn/collections/all" --deploy
 *
 * 此腳本是模板，Claude Code 會根據目標網站的 HTML 結構
 * 自動修改 parsePage() 函數來適配不同的網站格式。
 */

require("dotenv").config({ path: ".env.local" });
const db = require("./lib/supabase-helpers");

// ─── 設定 ────────────────────────────────────────────

const args = process.argv.slice(2);
const brandId = args[0];
const startUrl = args[1];
const maxPages = parseInt(args.find((a) => a.startsWith("--pages="))?.split("=")[1] || "99");
const shouldDeploy = args.includes("--deploy");

if (!brandId || !startUrl) {
  console.log(`
用法: node scripts/scrape-brand.js <brand-id> <url> [options]

Options:
  --pages=N   最多爬取 N 頁（預設: 99）
  --deploy    完成後自動觸發兩站部署

範例:
  node scripts/scrape-brand.js blish "https://blish.vn/collections/all"
  `);
  process.exit(1);
}

// ─── 網頁擷取 ────────────────────────────────────────

/**
 * 抓取網頁 HTML
 * 支援重試和延遲，避免被封鎖
 */
async function fetchPage(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      console.warn(`  ⚠️ 重試 ${i + 1}/${retries}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw new Error(`無法取得頁面: ${url}`);
}

/** 簡易延遲，避免請求過快 */
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── HTML 解析（需要根據目標網站修改）──────────────────

/**
 * ⚠️ 這是模板函數，Claude Code 會根據目標網站自動修改
 *
 * 解析列表頁 HTML，回傳產品列表
 * @param {string} html - 頁面 HTML
 * @param {string} baseUrl - 基礎 URL（用於拼接相對路徑）
 * @returns {{ products: Array, nextPageUrl: string|null }}
 */
function parseListPage(html, baseUrl) {
  // ==========================================
  // 👇 Claude Code 會修改以下區塊來適配不同網站
  // ==========================================

  const products = [];

  // 範例：用正則解析 Shopify 類型網站
  // 實際使用時 Claude Code 會根據 HTML 結構調整

  // 找到所有產品卡片
  const productRegex =
    /<div[^>]*class="[^"]*product-card[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
  const cards = html.match(productRegex) || [];

  for (const card of cards) {
    // 產品名稱
    const nameMatch = card.match(
      /<(?:h[2-4]|a|span)[^>]*class="[^"]*(?:title|name)[^"]*"[^>]*>(.*?)<\//i
    );
    // 產品 URL
    const urlMatch = card.match(/href="(\/[^"]*product[^"]*)"/i);
    // 產品圖片
    const imgMatch = card.match(
      /(?:src|data-src)="(https?:\/\/[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/i
    );
    // 價格（越南盾）
    const priceMatch = card.match(
      /(\d[\d.,]+)\s*(?:₫|VND|đ)/i
    );

    if (nameMatch) {
      const name = nameMatch[1].replace(/<[^>]*>/g, "").trim();
      products.push({
        name,
        detail_url: urlMatch
          ? new URL(urlMatch[1], baseUrl).href
          : null,
        original_cover_url: imgMatch ? imgMatch[1] : "",
        price_vnd: priceMatch
          ? parseInt(priceMatch[1].replace(/[.,]/g, ""))
          : null,
      });
    }
  }

  // 找下一頁連結
  const nextMatch = html.match(
    /href="([^"]*(?:page=|\/page\/)\d+[^"]*)"/i
  );
  const nextPageUrl = nextMatch
    ? new URL(nextMatch[1], baseUrl).href
    : null;

  // ==========================================
  // 👆 Claude Code 修改區塊結束
  // ==========================================

  return { products, nextPageUrl };
}

/**
 * ⚠️ 模板函數：解析產品詳情頁
 * @param {string} html - 詳情頁 HTML
 * @returns {Object} 額外的產品資訊（尺寸、圖片、分類等）
 */
function parseDetailPage(html) {
  const result = {
    sizes: [],
    gallery: [],
    category: "",
    tag: "",
  };

  // 尺寸
  const sizeRegex = /(?:data-value|value)="((?:XS|S|M|L|XL|XXL|2XL|3XL|ONE SIZE|\d+)[^"]*)"/gi;
  let sizeMatch;
  const seenSizes = new Set();
  while ((sizeMatch = sizeRegex.exec(html)) !== null) {
    const label = sizeMatch[1].trim();
    if (!seenSizes.has(label)) {
      seenSizes.add(label);
      result.sizes.push({ label, available: true });
    }
  }

  // 圖片集
  const galleryRegex =
    /(?:src|data-src|data-zoom-image)="(https?:\/\/[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
  let imgMatch;
  const seenUrls = new Set();
  while ((imgMatch = galleryRegex.exec(html)) !== null) {
    const url = imgMatch[1];
    if (!seenUrls.has(url) && !url.includes("logo") && !url.includes("icon")) {
      seenUrls.add(url);
      result.gallery.push({ url, type: "image" });
    }
  }

  return result;
}

// ─── 主流程 ──────────────────────────────────────────

async function main() {
  console.log(`\n🕷️  開始爬取品牌: ${brandId}`);
  console.log(`   URL: ${startUrl}\n`);

  const baseUrl = new URL(startUrl).origin;
  let allProducts = [];
  let currentUrl = startUrl;
  let page = 1;

  // Step 1: 爬取列表頁
  while (currentUrl && page <= maxPages) {
    console.log(`📄 第 ${page} 頁: ${currentUrl}`);
    const html = await fetchPage(currentUrl);
    const { products, nextPageUrl } = parseListPage(html, baseUrl);

    console.log(`   找到 ${products.length} 個產品`);
    allProducts = allProducts.concat(products);

    currentUrl = nextPageUrl;
    page++;

    if (currentUrl) await delay(1500); // 禮貌性延遲
  }

  console.log(`\n📊 共找到 ${allProducts.length} 個產品`);

  if (allProducts.length === 0) {
    console.log("⚠️ 未找到任何產品，請檢查 parseListPage() 的解析邏輯");
    process.exit(1);
  }

  // Step 2: 爬取詳情頁（可選）
  const shouldFetchDetails = allProducts.some((p) => p.detail_url);

  if (shouldFetchDetails) {
    console.log("\n🔍 開始爬取產品詳情頁...");
    const nextNum = await db.getNextProductNumber(brandId);

    for (let i = 0; i < allProducts.length; i++) {
      const p = allProducts[i];
      p.id = p.id || `${brandId}-${String(nextNum + i).padStart(3, "0")}`;

      if (p.detail_url) {
        try {
          console.log(
            `   [${i + 1}/${allProducts.length}] ${p.name}`
          );
          const detailHtml = await fetchPage(p.detail_url);
          const details = parseDetailPage(detailHtml);
          Object.assign(p, details);
          await delay(1000);
        } catch (err) {
          console.warn(`   ⚠️ 跳過詳情: ${err.message}`);
        }
      }
    }
  } else {
    // 自動分配 ID
    const nextNum = await db.getNextProductNumber(brandId);
    allProducts.forEach((p, i) => {
      p.id = p.id || `${brandId}-${String(nextNum + i).padStart(3, "0")}`;
    });
  }

  // Step 3: 寫入 Supabase
  console.log("\n💾 寫入 Supabase...");
  await db.upsertProducts(brandId, allProducts);

  // Step 4: 部署（可選）
  if (shouldDeploy) {
    console.log("\n🚀 觸發部署...");
    await db.triggerDeploy("all");
  }

  console.log(`\n✨ 完成！${allProducts.length} 個產品已寫入品牌 ${brandId}`);
  console.log(`   管理面板: https://neon-lotus-admin.vercel.app/products`);
}

main().catch((err) => {
  console.error("❌ 致命錯誤:", err);
  process.exit(1);
});
