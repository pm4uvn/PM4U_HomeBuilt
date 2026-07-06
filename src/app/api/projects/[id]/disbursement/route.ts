/**
 * GET /api/projects/:id/disbursement
 * Trả về % hoàn thành dự án + đợt giải ngân kế tiếp của từng hợp đồng.
 * (REST endpoint mẫu — mobile app sau này dùng chung tầng service với web)
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDashboardDisbursement } from "@/services/disbursement.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const data = await getDashboardDisbursement(id);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi máy chủ" },
      { status: 500 },
    );
  }
}
