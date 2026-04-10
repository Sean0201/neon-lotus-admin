"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [editing, setEditing] = useState(null); // brand id or "new"
  const [form, setForm] = useState(emptyForm());

  function emptyForm() {
    return {
      id: "",
      name: "",
      style: "",
      color_hex: "#0a0a1a",
      description_en: "",
      description_th: "",
      description_zh: "",
      category: "",
      website: "",
      founded: "",
      location: "",
    };
  }

  useEffect(() => {
    loadBrands();
  }, []);

  async function loadBrands() {
    const { data } = await supabase
      .from("brands")
      .select("*")
      .order("sort_order", { ascending: true });
    setBrands(data || []);
  }

  function startEdit(brand) {
    setEditing(brand.id);
    setForm({ ...brand });
  }

  function startNew() {
    setEditing("new");
    setForm(emptyForm());
  }

  async function save() {
    if (editing === "new") {
      const { error } = await supabase.from("brands").insert([form]);
      if (error) return alert("Error: " + error.message);
    } else {
      const { error } = await supabase
        .from("brands")
        .update(form)
        .eq("id", editing);
      if (error) return alert("Error: " + error.message);
    }
    setEditing(null);
    loadBrands();
  }

  async function deleteBrand(id) {
    if (!confirm(`確定要刪除品牌 ${id}？所有相關產品也會被刪除！`)) return;
    await supabase.from("brands").delete().eq("id", id);
    loadBrands();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">品牌管理</h2>
        <button
          onClick={startNew}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition"
        >
          + 新增品牌
        </button>
      </div>

      {/* 編輯 / 新增表單 */}
      {editing && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editing === "new" ? "新增品牌" : `編輯品牌: ${editing}`}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400">品牌 ID（英文小寫）</label>
              <input
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                disabled={editing !== "new"}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
                placeholder="e.g. blish"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">品牌名稱</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
                placeholder="e.g. BLISH"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">風格</label>
              <input
                value={form.style}
                onChange={(e) => setForm({ ...form, style: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
                placeholder="e.g. Futurism / Gorpcore"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">品牌主色 (HEX)</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={form.color_hex}
                  onChange={(e) =>
                    setForm({ ...form, color_hex: e.target.value })
                  }
                  className="h-10 w-14 bg-gray-800 border border-gray-700 rounded cursor-pointer"
                />
                <input
                  value={form.color_hex}
                  onChange={(e) =>
                    setForm({ ...form, color_hex: e.target.value })
                  }
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400">分類</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
                placeholder="e.g. Contemporary"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">官網</label>
              <input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
              />
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm text-gray-400">描述（中文）</label>
              <textarea
                value={form.description_zh}
                onChange={(e) =>
                  setForm({ ...form, description_zh: e.target.value })
                }
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">描述（泰文）</label>
              <textarea
                value={form.description_th}
                onChange={(e) =>
                  setForm({ ...form, description_th: e.target.value })
                }
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">描述（英文）</label>
              <textarea
                value={form.description_en}
                onChange={(e) =>
                  setForm({ ...form, description_en: e.target.value })
                }
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mt-1"
              />
            </div>
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

      {/* 品牌列表 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="text-left px-4 py-3 text-sm text-gray-400">色塊</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">ID</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">名稱</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">風格</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">分類</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr
                key={brand.id}
                className="border-t border-gray-800 hover:bg-gray-800/30"
              >
                <td className="px-4 py-3">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: brand.color_hex }}
                  />
                </td>
                <td className="px-4 py-3 font-mono text-sm">{brand.id}</td>
                <td className="px-4 py-3 font-semibold">{brand.name}</td>
                <td className="px-4 py-3 text-sm text-gray-400">
                  {brand.style}
                </td>
                <td className="px-4 py-3 text-sm">{brand.category}</td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    onClick={() => startEdit(brand)}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => deleteBrand(brand.id)}
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
    </div>
  );
}
