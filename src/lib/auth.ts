import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Dùng ở đầu mọi server action / page cần bảo vệ. Chưa đăng nhập -> /login */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}
