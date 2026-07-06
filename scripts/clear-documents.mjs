// Xóa toàn bộ hồ sơ (bảng Document) + file thật trong Storage bucket "documents"
// Dùng khi muốn dọn sạch dữ liệu mẫu/placeholder trước khi upload hồ sơ thật.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const docs = await prisma.document.findMany({ select: { id: true, title: true, fileUrl: true } });
console.log(`Tìm thấy ${docs.length} hồ sơ.`);

if (docs.length === 0) {
  console.log("Không có gì để xóa.");
  process.exit(0);
}

// Xóa file thật trong Storage (bỏ qua các placeholder giả lập từ seed, không tồn tại thật)
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const realPaths = docs.map((d) => d.fileUrl).filter((p) => !p.startsWith("seed/"));
if (serviceKey && realPaths.length > 0) {
  const admin = createClient(process.env.SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.storage.from("documents").remove(realPaths);
  if (error) console.warn("⚠️  Lỗi xóa file Storage:", error.message);
  else console.log(`✅ Đã xóa ${realPaths.length} file thật trong Storage`);
}

await prisma.document.deleteMany({});
console.log(`✅ Đã xóa ${docs.length} bản ghi hồ sơ trong CSDL`);

await prisma.$disconnect();
