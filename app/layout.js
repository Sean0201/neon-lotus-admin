import "./globals.css";

export const metadata = {
  title: "Neon Lotus Admin",
  description: "品牌與產品管理後台",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 bg-gray-900 border-r border-gray-800 min-h-screen p-6 fixed">
            <h1 className="text-xl font-bold text-purple-400 mb-8">
              🪷 Neon Lotus
            </h1>
            <nav className="space-y-2">
              <a
                href="/"
                className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                📊 Dashboard
              </a>
              <a
                href="/brands"
                className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                🏷️ 品牌管理
              </a>
              <a
                href="/products"
                className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                👕 產品管理
              </a>
              <a
                href="/deploy"
                className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                🚀 發布部署
              </a>
            </nav>
          </aside>

          {/* Main content */}
          <main className="ml-64 flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
