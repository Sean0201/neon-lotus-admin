# Neon Lotus Admin — Claude Code 工作指南

## 專案概覽

Neon Lotus 是越南街頭潮牌代購平台，包含：

- **Admin 面板**: `neon-lotus-admin.vercel.app` — 管理品牌/產品
- **中文站**: `neon-lotus-tw.vercel.app` — 台灣版（繁體中文）
- **泰文站**: `neon-lotus.vercel.app` — 泰國版（英文/泰文）

數據流：Supabase DB → Admin 面板編輯 → Deploy Hook 觸發 → 靜態站 rebuild 時從 Supabase 生成 data.js

## 資料庫結構（Supabase）

```
brands          — 品牌（id, name, style, color_hex, description_en/th/zh, category, website, ...）
products        — 產品（id, brand_id, name, tag, category, price_vnd, cover_image, sold_out, ...）
product_sizes   — 尺寸（product_id, label, available, sort_order）
product_gallery — 圖片（product_id, url, original_url, type, sort_order）
```

## 環境設定

在 `.env.local` 中需要：

```
NEXT_PUBLIC_SUPABASE_URL=https://epemuyojkprepknuzuzc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=（從 Supabase Dashboard > Settings > API 取得）
VERCEL_DEPLOY_HOOK_ZH=（中文站 deploy hook URL）
VERCEL_DEPLOY_HOOK_TH=（泰文站 deploy hook URL）
```

## 爬蟲工作流程

當用戶提供一個品牌網址要求抓取時，按以下步驟操作：

### Step 1：分析網站結構
1. 用 WebFetch 或 curl 取得目標頁面 HTML
2. 觀察 HTML 結構，找到產品卡片的 selector、分頁機制、詳情頁結構

### Step 2：撰寫爬蟲腳本
基於 `scripts/scrape-brand.js` 模板修改 parseListPage() 和 parseDetailPage()
建議為每個品牌建立獨立腳本：`scripts/scrape-<brand-id>.js`

### Step 3：執行爬蟲
```bash
node scripts/scrape-brand.js <brand-id> "<url>" --pages=10
node scripts/scrape-brand.js <brand-id> "<url>" --deploy  # 完成後自動部署
```

### Step 4：驗證
到 Admin 面板查看：https://neon-lotus-admin.vercel.app/products

## 使用 supabase-helpers 直接操作

```javascript
require('dotenv').config({ path: '.env.local' });
const db = require('./scripts/lib/supabase-helpers');

await db.upsertBrand({
  id: 'newbrand', name: 'NEW BRAND', style: 'Streetwear',
  category: 'Streetwear', website: 'https://newbrand.vn',
  description_zh: '品牌中文描述',
});

await db.upsertProducts('newbrand', [{
  id: 'newbrand-001', name: 'Product Name', category: 'TEES', tag: 'Top',
  price_vnd: 450000, original_cover_url: 'https://example.com/image.jpg',
  sizes: [{ label: 'S', available: true }, { label: 'M', available: true }],
  gallery: [{ url: 'https://example.com/img1.jpg', type: 'image' }],
}]);

await db.triggerDeploy('all');
```

## 產品分類對照

tag (大分類): Outerwear, Top, Bottom, Accessories, Headwear, Bag, Dress
category (細分類): JACKETS, HOODIES, TEES, SHORTS, PANTS, LONGSLEEVES, SWEATERS, JERSEYS, TANKS, CAPS, POLOS, SHIRTS, BAGS, ACCESSORIES, FOOTWEAR, SKIRTS, UNDERWEAR, SCARVES, WALLETS, TOP, BOTTOM, BELTS, SWEATSHIRTS, KNITWEAR, DRESSES, TOPS, SETS, SWIMWEAR

## 注意事項

- 新抓取的產品預設 needs_review: true，在 Admin 面板審核後改為 false
- 產品 ID 格式：`<brand-id>-<三位數序號>`，如 blish-001
- 爬蟲請求間隔建議 1-2 秒，避免被封鎖
- 圖片先存原始 URL（original_cover_url），不需要下載
