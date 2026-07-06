import { createClient } from "@supabase/supabase-js";

export const DOCUMENTS_BUCKET = "documents";

/** Client Supabase với service key — CHỈ dùng server-side (upload/signed URL) */
export function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return null;
  return createClient(process.env.SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Chuẩn hóa tên file về thuần ASCII an toàn cho storage key:
 * bỏ dấu tiếng Việt (kể cả Đ/đ không tách được bằng NFD), khoảng trắng -> "_".
 * Supabase Storage (S3-compatible) từ chối key chứa ký tự Unicode dấu.
 */
function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // bỏ dấu thanh (combining marks còn lại sau NFD)
    .replace(/[Đđ]/g, (c) => (c === "Đ" ? "D" : "d")) // Đ/đ không tách được bằng NFD
    .replace(/[^a-zA-Z0-9._-]/g, "_") // mọi ký tự lạ còn lại (khoảng trắng, ký hiệu...) -> _
    .replace(/_+/g, "_");
}

/** Upload file lên bucket documents; tự tạo bucket nếu chưa có. Trả về storage path. */
export async function uploadToStorage(file: File, projectId: string): Promise<string> {
  const client = getServiceClient();
  if (!client) {
    throw new Error(
      "Chưa cấu hình SUPABASE_SERVICE_KEY trong .env (Dashboard → Project Settings → API Keys → secret key)",
    );
  }
  const safeName = sanitizeFileName(file.name);
  const path = `${projectId}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let { error } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, buffer, { contentType: file.type || "application/octet-stream" });

  if (error && /bucket not found/i.test(error.message)) {
    await client.storage.createBucket(DOCUMENTS_BUCKET, { public: false });
    ({ error } = await client.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, buffer, { contentType: file.type || "application/octet-stream" }));
  }
  if (error) throw new Error(`Upload thất bại: ${error.message}`);
  return path;
}

/** Tạo signed URL xem/tải file (private bucket), hết hạn sau 1 giờ */
export async function getSignedUrl(path: string): Promise<string | null> {
  const client = getServiceClient();
  if (!client) return null;
  const { data } = await client.storage.from(DOCUMENTS_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Xóa file khỏi storage — dùng khi xóa 1 Document, tránh để lại file mồ côi trong bucket */
export async function removeFromStorage(path: string): Promise<void> {
  const client = getServiceClient();
  if (!client) return;
  await client.storage.from(DOCUMENTS_BUCKET).remove([path]);
}
