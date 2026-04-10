"use client";
import { useState } from "react";

export default function DeployPage() {
  const [status, setStatus] = useState({ zh: null, th: null });
  const [loading, setLoading] = useState({ zh: false, th: false });

  async function triggerDeploy(target) {
    setLoading((prev) => ({ ...prev, [target]: true }));
    setStatus((prev) => ({ ...prev, [target]: null }));

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus((prev) => ({
          ...prev,
          [target]: { success: true, message: "部署已觸發！Vercel 正在建置中..." },
        }));
      } else {
        setStatus((prev) => ({
          ...prev,
          [target]: { success: false, message: data.error || "部署失敗" },
        }));
      }
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        [target]: { success: false, message: err.message },
      }));
    }

    setLoading((prev) => ({ ...prev, [target]: false }));
  }

  async function deployAll() {
    await Promise.all([triggerDeploy("zh"), triggerDeploy("th")]);
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">發布部署</h2>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold mb-2">部署說明</h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          按下部署按鈕後，系統會從 Supabase 資料庫抓取最新的品牌和產品資料，
          自動產生 <code className="text-purple-400">data.js</code>，
          然後觸發 Vercel 重新建置對應的網站。整個過程約需 1-3 分鐘。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 中文站 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-2">🇹🇼 中文站</h3>
          <p className="text-gray-400 text-sm mb-4">
            部署到中文版 Vercel 專案
          </p>
          <button
            onClick={() => triggerDeploy("zh")}
            disabled={loading.zh}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-3 rounded-lg transition font-semibold"
          >
            {loading.zh ? "部署中..." : "部署中文站"}
          </button>
          {status.zh && (
            <p
              className={`mt-3 text-sm ${
                status.zh.success ? "text-green-400" : "text-red-400"
              }`}
            >
              {status.zh.message}
            </p>
          )}
        </div>

        {/* 泰文站 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-2">🇹🇭 泰文站</h3>
          <p className="text-gray-400 text-sm mb-4">
            部署到泰文版 Vercel 專案
          </p>
          <button
            onClick={() => triggerDeploy("th")}
            disabled={loading.th}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 px-6 py-3 rounded-lg transition font-semibold"
          >
            {loading.th ? "部署中..." : "部署泰文站"}
          </button>
          {status.th && (
            <p
              className={`mt-3 text-sm ${
                status.th.success ? "text-green-400" : "text-red-400"
              }`}
            >
              {status.th.message}
            </p>
          )}
        </div>
      </div>

      {/* 一鍵全部部署 */}
      <div className="mt-6">
        <button
          onClick={deployAll}
          disabled={loading.zh || loading.th}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-4 rounded-xl transition font-bold text-lg"
        >
          {loading.zh || loading.th
            ? "部署中..."
            : "🚀 一鍵部署全部站點"}
        </button>
      </div>
    </div>
  );
}
