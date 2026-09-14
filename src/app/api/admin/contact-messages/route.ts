import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/src/modules/admin/auth-guard";
import { AdminService } from "@/src/modules/admin/service";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(["NEW", "READ", "REPLIED", "ARCHIVED", "ALL"]).optional(),
  search: z.string().max(100).optional(),
});

export async function GET(req: Request) {
  const auth = await getAdminSession();
  if (!auth.isAdmin || !auth.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = await AdminService.getContactMessagesPaginated(parsed.data);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[AdminContactMessages] Fetch error:", err);
    return NextResponse.json(
      { error: "Failed to load contact messages. Please try again." },
      { status: 503 }
    );
  }
}
