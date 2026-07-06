// Tạo user đăng nhập qua Supabase Admin API (cần SUPABASE_SERVICE_KEY trong .env)
// Cách dùng: node scripts/create-user.mjs <email> <password>
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Cách dùng: node scripts/create-user.mjs <email> <password>");
  process.exit(1);
}
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
if (!serviceKey) {
  console.error(
    "❌ Thiếu SUPABASE_SERVICE_KEY trong .env.\n" +
      "   Lấy tại: Dashboard -> Project Settings -> API Keys -> secret key (sb_secret_...)",
  );
  process.exit(1);
}

const admin = createClient(process.env.SUPABASE_URL, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true, // bỏ qua bước xác nhận email
});
if (error) {
  console.error("❌ Lỗi:", error.message);
  process.exit(1);
}
console.log(`✅ Đã tạo user ${data.user.email} (id: ${data.user.id})`);
