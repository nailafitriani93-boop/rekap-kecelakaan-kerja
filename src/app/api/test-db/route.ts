import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.query("SELECT NOW() AS waktu");

    return NextResponse.json({
      success: true,
      message: "PostgreSQL berhasil terhubung",
      waktu: result.rows[0].waktu,
    });
  } catch (error) {
    console.error("DATABASE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal terhubung ke PostgreSQL",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}