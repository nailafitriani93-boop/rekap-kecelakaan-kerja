
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await db.query(
      `SELECT id, name, description
       FROM user_roles
       ORDER BY CASE id WHEN 'admin' THEN 1 WHEN 'user' THEN 2 ELSE 3 END,
                name ASC`
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET ROLES ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil role." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    if (!["Admin", "User"].includes(name)) {
      return NextResponse.json(
        {
          success: false,
          message: "Role yang diizinkan hanya Admin dan User.",
        },
        { status: 400 }
      );
    }

    const id = name.toLowerCase();
    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const result = await db.query(
      `INSERT INTO user_roles (id, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (id)
       DO UPDATE SET name = EXCLUDED.name,
                     description = EXCLUDED.description
       RETURNING id, name, description`,
      [id, name, description]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("SAVE ROLE ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal menyimpan role." },
      { status: 500 }
    );
  }
}
