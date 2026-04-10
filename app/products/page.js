"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const CATEGORIES = [
  "JACKETS", "HOODIES", "TEES", "SHORTS", "PANTS", "LONGSLEEVES",
  "SWEATERS", "JERSEYS", "TANKS", "CAPS", "POLOS", "SHIRTS",
  "BAGS", "ACCESSORIES", "FOOTWEAR", "SKIRTS", "UNDERWEAR",
  "SCARVES", "WALLETS", "TOP", "BOTTOM", "BELTS", "SWEATSHIRTS",
  "KNITWEAR", "DRESSES", "TOPS", "SETS", "SWIMWEAR",
];

const TAGS = [
  "Outerwear", "Top", "Bottom", "Accessories", "Headwear",
  "Bag", "Dress", "Áo Dài",
];

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [filters, setFilters] = useState({ brand_id: "", category: "", search: "" });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  function emptyForm() {
    return {
      id: "",
      brand_id: "",
      name: "",
      tag: "",
      category: "",
      season: "",
      price_vnd: null,
      price_vnd_estimated: null,
      price_thb_shipping: null,
      price_thb_carryback: null,
      price_note: "",
      cover_image: "",
      original_cover_url: "",
      sold_out: false,
      needs_review: false,
    };
  }

  useEffect(() => {
    supabase
      .from("brands")
      .select("id, name")
      .order("name")
      .then(({ data }) => setBrands(data || []));
  }, []);

  useEffect(() => {
    loadProducts();
  }, [filters, page]);

  async function loadProducts() {
    let query = supabase
      .from("products")
      .select("*, brand:brands(name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filters.brand_id) query = query.eq("brand_id", filters.brand_id);
    if (filters.category) query = query.eq("category", filters.category);
    if (filters.search) query = query.ilike("name", `%${filters.search}%`);

    const { data, count } = await query;
    setProducts(data || []);
  }

  function startNew() {
    setEditing("new");
    setForm(emptyForm());
  }

  function startEdit(product) {
    setEditing(product.id);
    setForm({
      id: product.id,
      brand_id: product.brand_id,
      name: product.name,
      tag: product.tag || "",
      category: product.category || "",
      season: product.season || "",
      price_vnd: product.price_vnd,
      price_vnd_estimated: product.price_vnd_estimated,
      price_thb_shipping: product.price_thb_shipping,
      price_thb_carryback: product.price_thb_carryback,
      price_note: product.price_note || "",
      cover_image: product.cover_image || "",
      original_cover_url: product.original_cover_url || "",
      sold_out: product.sold_out || false,
      needs_review: product.needs_review || false,
    });
  }

  async function save() {
    const payload = { ...form };
    // 清除空數字欄位
    ["price_vnd", "price_vnd_estimated", "price_thb_shipping", "price_thb_carryback"].forEach(
      (k) => { if (!payload[k]) payload[k] = null; }
    );

    if (editing === "new") {
      // 自動生成 ID: brand_id + 序號
      if (!payload.id && payload.brand_id) {
        const { count } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("brand_id", payload.brand_id);
        payload.id = `${payload.brand_id}-${String((count || 0) + 1).padStart(3, "0")}`;
      }
      const { error } = await supabase.from("products").insert([payload]);
      if (error) return alert("Error: " + error.message);
    } else {
      const { id, ...updates } = payload;
      const { error } = await supabase.from("products").update(updates).eq("id", editing);
      if (error) return alert("Error: " + error.message);
    }
    setEditing(null);
    loadProducts();
  }

  async function deleteProduct(id) {
    if (!confirm(`確定刪除產品 ${id}？`)) return;
    await supabase.from("products").delete().eq("id", id);
    loadProducts();
  }

  function formatPrice(vnd) {
    if (!vnd) return "-";
    return new Intl.NumberFormat("vi-VN").format(vnd) + "₫";
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">產品管理</h2>
        <button
          onClick={startNew}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition"
        >
          + 新增產品
        </button>
      </div>

      {/* 篩選器 */}
      <div className="flex gap-4 mb-6">
        <input
          placeholder="搜尋產品名稱..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 w-64"
        />
        <select
          value={filters.brand_id}
          onChange={(e) => setFilters({ ...filters, brand_id: e.target.value })}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
        >
          <option value="">所有品牌</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
        >
          <option value="">所有分類</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* 編輯表單 */}
      {editing && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editing === "new" ? "新增產品" : `編輿: ${editing}`}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-400">品牌</label>
              <select
                value={form.brand_id}
                onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
              >
                <option value="">選擇品牌</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400">產品名稱</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">產品 ID（自動產生或手動輸入）</label>
              <input
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                disabled={editing !== "new"}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
                placeholder="留空自動產生"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Tag</label>
              <select
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
              >
                <option value="">選擇</option>
                {TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
              >
                <option value="">選擇</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400">Season</label>
              <input
                value={form.season}
                onChange={(e) => setForm({ ...form, season: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
                placeholder="e.g. SS26"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-4">
            <div>
              <label className="text-sm text-gray-400">VND 原價</label>
              <input
                type="number"
                value={form.price_vnd || ""}
                onChange={(e) =>
                  setForm({ ...form, price_vnd: parseInt(e.target.value) || null })
                }
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">VND 預估價</label>
              <input
                type="number"
                value={form.price_vnd_estimated || ""}
                onChange={(e) =>
                  setForm({ ...form, price_vnd_estimated: parseInt(e.target.value) || null })
                }
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">THB（含運）</label>
              <input
                type="number"
                value={form.price_thb_shipping || ""}
                onChange={(e) =>
                  setForm({ ...form, price_thb_shipping: parseInt(e.target.value) || null })
                }
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">THB（自取）</label>
              <input
                type="number"
                value={form.price_thb_carryback || ""}
                onChange={(e) =>
                  setForm({ ...form, price_thb_carryback: parseInt(e.target.value) || null })
                }
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm text-gray-400">封面圖路徑</label>
              <input
                value={form.cover_image}
                onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
                placeholder="images/products/brand/product-id/cover.jpg"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">原始封面 URL</label>
              <input
                value={form.original_cover_url}
                onChange={(e) =>
                  setForm({ ...form, original_cover_url: e.target.value })
                }
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
              />
            </div>
          </div>

          <div className="flex gap-6 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sold_out}
                onChange={(e) => setForm({ ...form, sold_out: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm">已售完</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.needs_review}
                onChange={(e) =>
                  setForm({ ...form, needs_review: e.target.checked })
                }
                className="w-4 h-4"
              />
              <span className="text-sm">待審核</span>
            </label>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={save}
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition"
            >
              儲存
            </button>
            <button
              onClick={() => setEditing(null)}
              className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg transition"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 產品列表 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="text-left px-4 py-3 text-sm text-gray-400">ID</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">品牌</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">名稱</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">分類</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">VND</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">狀態</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                <td className="px-4 py-3 text-sm">{p.brand?.name || p.brand_id}</td>
                <td className="px-4 py-3 text-sm">{p.name}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{p.category}</td>
                <td className="px-4 py-3 text-sm">{formatPrice(p.price_vnd)}</td>
                <td className="px-4 py-3 text-xs space-x-1">
                  {p.sold_out && (
                    <span className="bg-red-900/50 text-red-400 px-2 py-0.5 rounded">
                      售完
                    </span>
                  )}
                  {p.needs_review && (
                    <span className="bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded">
                      待審
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    onClick={() => startEdit(p)}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => deleteProduct(p.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
      <div className="flex gap-3 mt-4 justify-center">
        <button
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className="bg-gray-800 px-4 py-2 rounded disabled:opacity-30"
        >
          上一頁
        </button>
        <span className="px-4 py-2 text-gray-400">第 {page + 1} 頁</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={products.length < PAGE_SIZE}
          className="bg-gray-800 px-4 py-2 rounded disabled:opacity-30"
        >
          下一頁
        </button>
      </div>
    </div>
  );
}
