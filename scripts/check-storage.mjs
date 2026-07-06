// Kiểm tra service key + tạo bucket "documents" nếu chưa có
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: buckets, error } = await admin.storage.listBuckets();
if (error) {
  console.error("❌ Service key KHÔNG hợp lệ:", error.message);
  process.exit(1);
}
console.log("✅ Service key hợp lệ. Buckets hiện có:", buckets.map((b) => b.name).join(", ") || "(chưa có)");

if (!buckets.some((b) => b.name === "documents")) {
  const { error: e2 } = await admin.storage.createBucket("documents", { public: false });
  if (e2) {
    console.error("❌ Tạo bucket lỗi:", e2.message);
    process.exit(1);
  }
  console.log("✅ Đã tạo bucket 'documents' (private)");
} else {
  console.log("✅ Bucket 'documents' đã sẵn sàng");
}
