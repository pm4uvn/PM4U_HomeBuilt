import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 7 + driver adapter chạy native trong Node — không bundle vào webpack/turbopack
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  experimental: {
    // Mặc định Server Actions chỉ nhận 1MB — nâng lên khớp giới hạn 50MB của uploadDocument()
    serverActions: { bodySizeLimit: "50mb" },
  },
};

export default nextConfig;
