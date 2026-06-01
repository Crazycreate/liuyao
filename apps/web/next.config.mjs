/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 排卦/AI 引擎用到 fs、import.meta.url、lunar/openai/anthropic,只在服务端运行,
  // 标记为 external 避免被打进客户端 bundle 或破坏数据文件路径解析。
  experimental: {
    serverComponentsExternalPackages: [
      "liuyao",
      "lunar-javascript",
      "openai",
      "@anthropic-ai/sdk",
    ],
  },
};

export default nextConfig;
