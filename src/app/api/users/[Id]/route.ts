import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

function formatDate(value: unknown) {
  if (!value) return "";

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function formatTime(value: unknown) {
  if (!value) return "";

  const text = String(value);

  return text.length >= 8 ? text.slice(0, 8) : text;
}

function toAccident(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ""),
    tanggal: formatDate(row.tanggal),
    waktu: formatTime(row.waktu),
    lokasi: String(row.lokasi ?? ""),
    grouping: String(row.grouping ?? ""),
    kronologi: String(row.kronologi ?? ""),
    akibat: String(row.akibat ?? ""),
    statusRujuk: String(row.status_rujuk ?? ""),
    typeAccident: String(row.type_accident ?? ""),
    createdAt: row.created_at
      ? new Date(String(row.created_at)).toISOString()
      : new Date().toISOString(),

    worker: {
      no: String(row.worker_no ?? ""),
      kit: String(row.worker_kit ?? ""),
      namaLengkap: String(row.worker_nama ?? ""),
      jenisKelamin: String(row.worker_gender ?? ""),
      umur: Number(row.worker_umur ?? 0),
      subDep: String(row.worker_sub_dep ?? ""),
      divSubDiv: String(row.worker_div_sub_div ?? ""),
      statusPekerja: String(row.worker_status ?? ""),
    },
  };
}

const SELECT = `
  SELECT
    a.id_kecelakaan AS id,
    a.tanggal,
    a.waktu,
    a.lokasi,
    a.grouping_kecelakaan AS grouping,
    a.kronologi,
    a.akibat,
    a.status_rujuk,
    a.type_accident,
    a.created_at,

    ROW_NUMBER() OVER (
      ORDER BY mp.nama_lengkap ASC
    ) AS worker_no,

    mp.kit AS worker_kit,
    mp.nama_lengkap AS worker_nama,
    mp.jenis_kelamin AS worker_gender,
    mp.umur AS worker_umur,
    mp.sub_dep AS worker_sub_dep,
    mp.div_subdiv AS worker_div_sub_div,
    mp.status_pekerja AS worker_status

  FROM transaksi_kecelakaan a

  JOIN master_pekerja mp
    ON mp.id_pekerja = a.id_pekerja
`;

export async function PUT(
  request: Request,
  context: Context
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "ID kecelakaan wajib tersedia." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const kit = String(
      body?.worker?.kit ?? body?.kit ?? ""
    ).trim();

    const tanggal = String(body?.tanggal ?? "").trim();

    if (!kit || !tanggal) {
      return NextResponse.json(
        {
          error: "KIT pekerja dan tanggal kecelakaan wajib diisi.",
        },
        { status: 400 }
      );
    }

    const workerResult = await db.query(
      `
      SELECT id_pekerja
      FROM master_pekerja
      WHERE kit = $1
      LIMIT 1
      `,
      [kit]
    );

    if (!workerResult.rowCount) {
      return NextResponse.json(
        {
          error: "KIT pekerja tidak ditemukan di master data.",
        },
        { status: 400 }
      );
    }

    const idPekerja = workerResult.rows[0].id_pekerja;

    const result = await db.query(
      `
      UPDATE transaksi_kecelakaan
      SET
        id_pekerja = $2,
        tanggal = $3,
        waktu = NULLIF($4, '')::TIME,
        lokasi = NULLIF($5, ''),
        grouping_kecelakaan = NULLIF($6, ''),
        kronologi = NULLIF($7, ''),
        akibat = NULLIF($8, ''),
        status_rujuk = NULLIF($9, ''),
        type_accident = NULLIF($10, '')
      WHERE id_kecelakaan = $1
      RETURNING id_kecelakaan
      `,
      [
        id,
        idPekerja,
        tanggal,
        String(body?.waktu ?? "").trim(),
        String(body?.lokasi ?? "").trim(),
        String(body?.grouping ?? "").trim(),
        String(body?.kronologi ?? "").trim(),
        String(body?.akibat ?? "").trim(),
        String(body?.statusRujuk ?? "").trim(),
        String(body?.typeAccident ?? "").trim(),
      ]
    );

    if (!result.rowCount) {
      return NextResponse.json(
        { error: "Data kecelakaan tidak ditemukan." },
        { status: 404 }
      );
    }

    const updated = await db.query(
      `
      ${SELECT}
      WHERE a.id_kecelakaan = $1
      `,
      [id]
    );

    if (!updated.rowCount) {
      return NextResponse.json(
        {
          error: "Data berhasil diperbarui, tetapi gagal dibaca kembali.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data kecelakaan berhasil diperbarui.",
      data: toAccident(updated.rows[0]),
    });
  } catch (error) {
    console.error("PUT /api/accidents/[id]:", error);

    return NextResponse.json(
      { error: "Gagal memperbarui data kecelakaan." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: Context
) {
  try {
    const { id } = await context.params;
    const accidentId = String(id ?? "").trim();

    if (!accidentId) {
      return NextResponse.json(
        { error: "ID kecelakaan wajib tersedia." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
      DELETE FROM transaksi_kecelakaan
      WHERE id_kecelakaan::text = $1
      RETURNING id_kecelakaan
      `,
      [accidentId]
    );

    if (!result.rowCount) {
      const databaseInfo = await db.query(`
        SELECT
          current_database() AS database_name,
          current_schema() AS schema_name
      `);

      const databaseName =
        databaseInfo.rows[0]?.database_name ?? "tidak diketahui";

      const schemaName =
        databaseInfo.rows[0]?.schema_name ?? "tidak diketahui";

      console.error(
        "DELETE /api/accidents/[id]: ID kecelakaan tidak ditemukan.",
        {
          requestedId: accidentId,
          database: databaseName,
          schema: schemaName,
        }
      );

      return NextResponse.json(
        {
          error:
            `Data kecelakaan ID ${accidentId} tidak ditemukan pada database ` +
            `${databaseName}, schema ${schemaName}. ` +
            "Muat ulang halaman dan periksa apakah website menggunakan database yang sama dengan PostgreSQL yang diperiksa.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data kecelakaan berhasil dihapus.",
      id: String(result.rows[0].id_kecelakaan),
    });
  } catch (error) {
    console.error("DELETE /api/accidents/[id]:", error);

    return NextResponse.json(
      { error: "Gagal menghapus data kecelakaan dari database." },
      { status: 500 }
    );
  }
}