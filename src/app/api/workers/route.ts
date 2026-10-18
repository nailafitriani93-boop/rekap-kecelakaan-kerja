import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type WorkerPayload = {
  no?: string;
  kit: string;
  namaLengkap: string;
  jenisKelamin?: string;
  umur?: number;
  subDep?: string;
  divSubDiv?: string;
  statusPekerja?: string;
};

function toWorker(row: Record<string, unknown>) {
  return {
    no: String(row.no ?? ""),
    kit: String(row.kit ?? ""),
    namaLengkap: String(row.nama_lengkap ?? ""),
    jenisKelamin: String(row.jenis_kelamin ?? ""),
    umur: Number(row.umur ?? 0),
    subDep: String(row.sub_dep ?? ""),
    divSubDiv: String(row.div_subdiv ?? ""),
    statusPekerja: String(row.status_pekerja ?? ""),
  };
}

export async function GET() {
  try {
    const result = await db.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY nama_lengkap ASC) AS no,
        kit,
        nama_lengkap,
        jenis_kelamin,
        umur,
        sub_dep,
        div_subdiv,
        status_pekerja
      FROM master_pekerja
      WHERE aktif = TRUE
      ORDER BY nama_lengkap ASC
    `);

    return NextResponse.json(result.rows.map(toWorker));
  } catch (error) {
    console.error("GET /api/workers:", error);

    return NextResponse.json(
      { error: "Gagal mengambil master data pekerja." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    workers?: WorkerPayload[];
  };

  const workers = Array.isArray(body.workers) ? body.workers : [];

  if (!workers.length) {
    return NextResponse.json(
      { error: "Data pekerja kosong." },
      { status: 400 }
    );
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    for (const worker of workers) {
      const kit = String(worker.kit ?? "").trim();
      const namaLengkap = String(worker.namaLengkap ?? "").trim();

      if (!kit || !namaLengkap) continue;

      await client.query(
        `
        INSERT INTO master_pekerja (
          kit,
          nama_lengkap,
          jenis_kelamin,
          umur,
          sub_dep,
          div_subdiv,
          status_pekerja,
          aktif,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          TRUE,
          NOW()
        )
        ON CONFLICT (kit) DO UPDATE SET
          nama_lengkap = EXCLUDED.nama_lengkap,
          jenis_kelamin = EXCLUDED.jenis_kelamin,
          umur = EXCLUDED.umur,
          sub_dep = EXCLUDED.sub_dep,
          div_subdiv = EXCLUDED.div_subdiv,
          status_pekerja = EXCLUDED.status_pekerja,
          aktif = TRUE,
          updated_at = NOW()
        `,
        [
          kit,
          namaLengkap,
          String(worker.jenisKelamin ?? ""),
          Number(worker.umur ?? 0),
          String(worker.subDep ?? ""),
          String(worker.divSubDiv ?? ""),
          String(worker.statusPekerja ?? ""),
        ]
      );
    }

    await client.query("COMMIT");

    const result = await client.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY nama_lengkap ASC) AS no,
        kit,
        nama_lengkap,
        jenis_kelamin,
        umur,
        sub_dep,
        div_subdiv,
        status_pekerja
      FROM master_pekerja
      WHERE aktif = TRUE
      ORDER BY nama_lengkap ASC
    `);

    return NextResponse.json(result.rows.map(toWorker));
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("POST /api/workers:", error);

    return NextResponse.json(
      { error: "Gagal menyimpan master data pekerja." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}