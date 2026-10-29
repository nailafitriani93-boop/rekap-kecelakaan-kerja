
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await db.query(`
      SELECT id, nama_grouping
      FROM public.accident_groupings
      ORDER BY nama_grouping ASC
    `);

    return NextResponse.json(
      result.rows.map((row) => ({
        id: String(row.id),
        namaGrouping: String(row.nama_grouping),
      }))
    );
  } catch (error) {
    console.error("GET /api/accident-groupings:", error);

    return NextResponse.json(
      { error: "Gagal mengambil daftar grouping." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: { namaGrouping?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

    const namaGrouping =
      typeof body.namaGrouping === "string"
        ? body.namaGrouping.trim()
        : "";

    if (!namaGrouping || namaGrouping.length > 150) {
      return NextResponse.json(
        { error: "Nama grouping wajib diisi, maksimal 150 karakter." },
        { status: 400 }
      );
    }

    const duplicate = await db.query(
      `
      SELECT id
      FROM public.accident_groupings
      WHERE LOWER(nama_grouping) = LOWER($1)
      LIMIT 1
      `,
      [namaGrouping]
    );

    if (duplicate.rowCount) {
      return NextResponse.json(
        { error: "Grouping tersebut sudah tersedia." },
        { status: 409 }
      );
    }

    const result = await db.query(
      `
      INSERT INTO public.accident_groupings (nama_grouping)
      VALUES ($1)
      RETURNING id, nama_grouping
      `,
      [namaGrouping]
    );

    const row = result.rows[0];

    return NextResponse.json(
      {
        id: String(row.id),
        namaGrouping: String(row.nama_grouping),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/accident-groupings:", error);

    return NextResponse.json(
      { error: "Gagal menyimpan grouping ke database." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let body: { id?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

    const id = String(body.id ?? "");

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { error: "ID grouping tidak valid." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
      DELETE FROM public.accident_groupings
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (!result.rowCount) {
      return NextResponse.json(
        { error: "Grouping tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Grouping berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE /api/accident-groupings:", error);

    return NextResponse.json(
      { error: "Gagal menghapus grouping dari database." },
      { status: 500 }
    );
  }
}
