import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

export async function GET() {
  try {
    const result = await db.query(`
      ${SELECT}
      ORDER BY a.tanggal DESC, a.created_at DESC
    `);

    return NextResponse.json(result.rows.map(toAccident));
  } catch (error) {
    console.error("GET /api/accidents:", error);

    return NextResponse.json(
      { error: "Gagal mengambil data kecelakaan." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const worker = body?.worker;

  if (!worker?.kit || !body?.tanggal) {
    return NextResponse.json(
      { error: "Pekerja dan tanggal kecelakaan wajib diisi." },
      { status: 400 }
    );
  }

  const kit = String(worker.kit).trim();

  try {
    const workerCheck = await db.query(
      `
      SELECT id_pekerja
      FROM master_pekerja
      WHERE kit = $1
        AND aktif = TRUE
      LIMIT 1
      `,
      [kit]
    );

    if (!workerCheck.rowCount) {
      return NextResponse.json(
        { error: "KIT pekerja tidak ditemukan di master data." },
        { status: 400 }
      );
    }

    const idPekerja = workerCheck.rows[0].id_pekerja;

    const result = await db.query(
      `
      INSERT INTO transaksi_kecelakaan (
        id_pekerja,
        tanggal,
        waktu,
        lokasi,
        grouping_kecelakaan,
        kronologi,
        akibat,
        status_rujuk,
        type_accident
      )
      VALUES (
        $1,
        $2,
        NULLIF($3, '')::TIME,
        $4,
        NULLIF($5, ''),
        NULLIF($6, ''),
        NULLIF($7, ''),
        NULLIF($8, ''),
        NULLIF($9, '')
      )
      RETURNING id_kecelakaan
      `,
      [
        idPekerja,
        body.tanggal,
        String(body.waktu ?? "").trim(),
        String(body.lokasi ?? "").trim(),
        String(body.grouping ?? "").trim(),
        String(body.kronologi ?? "").trim(),
        String(body.akibat ?? "").trim(),
        String(body.statusRujuk ?? "").trim(),
        String(body.typeAccident ?? "").trim(),
      ]
    );

    const saved = await db.query(
      `
      ${SELECT}
      WHERE a.id_kecelakaan = $1
      `,
      [result.rows[0].id_kecelakaan]
    );

    return NextResponse.json(toAccident(saved.rows[0]), {
      status: 201,
    });
  } catch (error) {
    console.error("POST /api/accidents:", error);

    return NextResponse.json(
      { error: "Gagal menyimpan data kecelakaan." },
      { status: 500 }
    );
  }
}