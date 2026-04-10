/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允許從外部載入產品圖片
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.nvncdn.com" },
    ],
  },
};

module.exports = nextConfig;
