
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UserAccessRow = {
  id: string;
  username: string;
  name: string;
  role_id: string;
  status: string;
  access_pages: string[] | null;
};

export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const result = await db.query<UserAccessRow>(
      `SELECT id, username, name, role_id, status, access_pages
       FROM public.managed_users
       WHERE id = $1 AND username = $2
       LIMIT 1`,
      [session.userId, session.username]
    );
    const user = result.rows[0];

    if (!user || user.status !== "Aktif") {
      return NextResponse.json(
        { authenticated: false },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          userId: user.id,
          username: user.username,
          name: user.name,
          roleId: user.role_id,
          status: user.status,
          accessPages: Array.isArray(user.access_pages)
            ? user.access_pages
            : [],
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("AUTH_SESSION_ERROR:", error);

    return NextResponse.json(
      { authenticated: false },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
