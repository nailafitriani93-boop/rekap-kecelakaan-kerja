"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { workerData as fallbackWorkerData, type Worker } from "@/data/workerData";
import { parseXlsx, type ExcelRow } from "@/data/xlsxLite";

/*
 * MASTER DATA KARYAWAN
 *
 * Excel wajib memiliki tepat 7 atribut:
 *
 * KIT
 * Nama Lengkap
 * Jenis Kelamin
 * Umur
 * SubDep
 * Div/SubDiv
 * Status Pekerja
 */

const REQUIRED_COLUMNS = [
  "KIT",
  "Nama Lengkap",
  "Jenis Kelamin",
  "Umur",
  "SubDep",
  "Div/SubDiv",
  "Status Pekerja",
];

const normalize = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

function getCell(row: Record<string, unknown>, aliases: string[]) {
  const wanted = aliases.map(normalize);

  const key = Object.keys(row).find((candidate) =>
    wanted.includes(normalize(candidate))
  );

  return key ? row[key] : "";
}

/*
 * Membaca data Excel menjadi data Worker.
 * Hanya 7 atribut Master Karyawan yang digunakan.
 */
function mapRows(rows: ExcelRow[]): Worker[] {
  return rows
    .map((row, index) => ({
      no: String(getCell(row, ["No", "No."]) || index + 1),
      kit: String(getCell(row, ["KIT", "Kit"]) || "").trim(),
      namaLengkap: String(
        getCell(row, ["Nama Lengkap"]) || ""
      ).trim(),
      jenisKelamin: String(
        getCell(row, ["Jenis Kelamin"]) || ""
      ).trim(),
      umur: Number(getCell(row, ["Umur"])) || 0,
      subDep: String(
        getCell(row, ["SubDep", "Sub Dep"]) || ""
      ).trim(),
      divSubDiv: String(
        getCell(row, ["Div/SubDiv", "Div / SubDiv", "Div/Sub Div"]) || ""
      ).trim(),
      statusPekerja: String(
        getCell(row, ["Status Pekerja"]) || ""
      ).trim(),
    }))
    .filter((worker) => worker.kit && worker.namaLengkap);
}

/*
 * Menggabungkan data lama dengan data Excel berdasarkan KIT.
 *
 * KIT baru    -> tambah
 * KIT lama    -> update
 * KIT lama yang tidak ada di Excel -> tetap dipertahankan
 */
function mergeWorkers(
  existingWorkers: Worker[],
  uploadedWorkers: Worker[]
): Worker[] {
  const workerMap = new Map<string, Worker>();

  // Masukkan data lama terlebih dahulu
  existingWorkers.forEach((worker) => {
    const kit = String(worker.kit || "").trim();

    if (kit) {
      workerMap.set(kit, worker);
    }
  });

  // Data Excel akan menambah atau memperbarui berdasarkan KIT
  uploadedWorkers.forEach((worker) => {
    const kit = String(worker.kit || "").trim();

    if (!kit) return;

    const existing = workerMap.get(kit);

    workerMap.set(kit, {
      ...(existing || {}),
      ...worker,
      kit,
      no: existing?.no || worker.no,
    });
  });

  return Array.from(workerMap.values()).map((worker, index) => ({
    ...worker,
    no: String(index + 1),
  }));
}

export default function MasterDataPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [workers, setWorkers] =
    useState<Worker[]>(fallbackWorkerData);

  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /*
   * Ambil Master Data yang sudah tersimpan
   */
  useEffect(() => {
    let cancelled = false;

    fetch("/api/workers")
      .then(async (response) => {
        if (!response.ok) throw new Error("Gagal mengambil master data.");
        return response.json() as Promise<Worker[]>;
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setWorkers(data);
        }
      })
      .catch(() => {
        // Tetap gunakan fallback jika API/database belum tersedia.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Ringkasan Master Data
   */
  const summary = useMemo(() => {
    const male = workers.filter(
      (worker) =>
        normalize(worker.jenisKelamin) === "male" ||
        normalize(worker.jenisKelamin) === "laki-laki" ||
        normalize(worker.jenisKelamin) === "laki laki" ||
        normalize(worker.jenisKelamin) === "l"
    ).length;

    const female = workers.filter(
      (worker) =>
        normalize(worker.jenisKelamin) === "female" ||
        normalize(worker.jenisKelamin) === "perempuan" ||
        normalize(worker.jenisKelamin) === "p"
    ).length;

    const averageAge = workers.length
      ? Math.round(
          (workers.reduce(
            (sum, worker) => sum + worker.umur,
            0
          ) /
            workers.length) *
            10
        ) / 10
      : 0;

    return {
      male,
      female,
      averageAge,
    };
  }, [workers]);

  /*
   * Proses upload Excel Master Karyawan
   */
  const handleFile = async (file: File) => {
    setLoading(true);
    setError("");
    setMessage("");
    setFileName(file.name);

    try {
      /*
       * Hanya menerima .xlsx
       */
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        throw new Error(
          "Gunakan file Excel dengan format .xlsx."
        );
      }

      const rows = await parseXlsx(file);

      if (!rows.length) {
        throw new Error(
          "Sheet Excel tidak memiliki data."
        );
      }

      /*
       * Validasi kolom Master Karyawan
       */
      const firstRowKeys = Object.keys(rows[0]);

      const normalizedExcelColumns = firstRowKeys.map(
        normalize
      );

      const missingColumns = REQUIRED_COLUMNS.filter(
        (column) =>
          !normalizedExcelColumns.includes(
            normalize(column)
          )
      );

      if (missingColumns.length) {
        throw new Error(
          `Kolom wajib tidak ditemukan: ${missingColumns.join(
            ", "
          )}`
        );
      }

      /*
       * Validasi agar Excel hanya menggunakan
       * 7 atribut Master Karyawan.
       *
       * Kolom "No" tetap diperbolehkan sebagai nomor
       * bantu dari Excel, tetapi tidak digunakan sebagai
       * identitas utama.
       */
      const allowedColumns = [
        ...REQUIRED_COLUMNS,
        "No",
        "No.",
      ].map(normalize);

      const unsupportedColumns = firstRowKeys.filter(
        (column) =>
          !allowedColumns.includes(normalize(column))
      );

      if (unsupportedColumns.length) {
        throw new Error(
          `Excel Master Karyawan hanya boleh berisi 7 atribut: KIT, Nama Lengkap, Jenis Kelamin, Umur, SubDep, Div/SubDiv, Status Pekerja. Kolom tidak dikenal: ${unsupportedColumns.join(
            ", "
          )}`
        );
      }

      /*
       * Mapping Excel
       */
      const uploadedWorkers = mapRows(rows);

      if (!uploadedWorkers.length) {
        throw new Error(
          "Tidak ada data pekerja yang valid. Pastikan KIT dan Nama Lengkap terisi."
        );
      }

      /*
       * Cek KIT duplikat di dalam Excel
       */
      const kitSet = new Set<string>();
      const duplicateKits: string[] = [];

      uploadedWorkers.forEach((worker) => {
        const kit = String(worker.kit).trim();

        if (kitSet.has(kit)) {
          if (!duplicateKits.includes(kit)) {
            duplicateKits.push(kit);
          }
        }

        kitSet.add(kit);
      });

      if (duplicateKits.length) {
        throw new Error(
          `Ditemukan KIT duplikat di dalam Excel: ${duplicateKits.join(
            ", "
          )}`
        );
      }

      /*
       * Data yang sedang tampil adalah data master dari PostgreSQL.
       * Excel digabung berdasarkan KIT: KIT lama di-update, KIT baru ditambah.
       */
      const existingWorkers = workers;

      const existingKitSet = new Set(
        existingWorkers.map((worker) =>
          String(worker.kit || "").trim()
        )
      );

      let addedCount = 0;
      let updatedCount = 0;

      uploadedWorkers.forEach((worker) => {
        const kit = String(worker.kit).trim();

        if (existingKitSet.has(kit)) {
          updatedCount += 1;
        } else {
          addedCount += 1;
        }
      });

      const mergedWorkers = mergeWorkers(
        existingWorkers,
        uploadedWorkers
      );

      const response = await fetch("/api/workers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workers: mergedWorkers,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Gagal menyimpan master data ke PostgreSQL."
        );
      }

      const savedWorkers = Array.isArray(result)
        ? (result as Worker[])
        : mergedWorkers;

      setWorkers(savedWorkers);

      setMessage(
        `Master data berhasil diperbarui. ${addedCount} data karyawan baru ditambahkan dan ${updatedCount} data karyawan diperbarui. Total master karyawan: ${savedWorkers.length}.`
      );
          setMessage(
        `Master data berhasil diperbarui. ${addedCount} data karyawan baru ditambahkan dan ${updatedCount} data karyawan diperbarui. Total master karyawan: ${mergedWorkers.length}.`
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "File Excel tidak dapat diproses."
      );
    } finally {
      setLoading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-1">

        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Data Master Karyawan
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tambahkan atau perbarui data karyawan menggunakan
          Excel berdasarkan KIT. Data lama yang tidak terdapat
          pada file tetap dipertahankan.
        </p>
      </div>

      {/* MESSAGE */}
      {message && (
        <div className="ggf-alert-success">
          <b>Berhasil</b>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="ggf-alert-error">
          <b>Gagal</b>
          <span>{error}</span>
        </div>
      )}

      {/* UPLOAD */}
      <section className="ggf-card">
        <div className="ggf-card-header">
          <div>
            <h2>Upload Master Karyawan</h2>

            <p>
              Gunakan Excel dengan 7 kolom: KIT, Nama
              Lengkap, Jenis Kelamin, Umur, SubDep,
              Div/SubDiv, dan Status Pekerja.
            </p>
          </div>

          <span className="ggf-section-number">
            01
          </span>
        </div>

        <div className="mt-6 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-8 text-center dark:border-emerald-900/60 dark:bg-emerald-950/10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-emerald-700 shadow-sm dark:bg-gray-800 dark:text-emerald-400">
            ↑
          </div>

          <h3 className="mt-4 text-base font-semibold text-gray-800 dark:text-white/90">
            Pilih file Excel Master Karyawan
          </h3>

          <p className="mx-auto mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            Format .xlsx dengan atribut: KIT, Nama
            Lengkap, Jenis Kelamin, Umur, SubDep,
            Div/SubDiv, dan Status Pekerja.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void handleFile(file);
              }
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="ggf-submit mt-5"
          >
            {loading
              ? "Memproses Excel..."
              : "Pilih File Excel"}
          </button>

          {fileName && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              File dipilih: <b>{fileName}</b>
            </p>
          )}
        </div>

        {/* FORMAT EXCEL */}
        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Format Excel yang digunakan
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2">KIT</th>
                  <th className="px-3 py-2">
                    Nama Lengkap
                  </th>
                  <th className="px-3 py-2">
                    Jenis Kelamin
                  </th>
                  <th className="px-3 py-2">Umur</th>
                  <th className="px-3 py-2">SubDep</th>
                  <th className="px-3 py-2">
                    Div/SubDiv
                  </th>
                  <th className="px-3 py-2">
                    Status Pekerja
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td className="px-3 py-2">100001</td>
                  <td className="px-3 py-2">
                    Contoh Nama
                  </td>
                  <td className="px-3 py-2">
                    Laki-laki
                  </td>
                  <td className="px-3 py-2">30</td>
                  <td className="px-3 py-2">
                    Produksi
                  </td>
                  <td className="px-3 py-2">
                    Div A
                  </td>
                  <td className="px-3 py-2">
                    Karyawan Tetap
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SUMMARY */}
      <section className="ggf-card">
        <div className="ggf-card-header">
          <div>
            <h2>Master Data Aktif</h2>

            <p>
              Data karyawan yang saat ini digunakan oleh
              form dan dashboard.
            </p>
          </div>

          <span className="ggf-section-number">
            02
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metric
            label="Jumlah Pekerja"
            value={workers.length}
          />

          <Metric
            label="Male"
            value={summary.male}
          />

          <Metric
            label="Female"
            value={summary.female}
          />
        </div>

        <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
          Rata-rata umur:{" "}
          <b>{summary.averageAge} tahun</b>
        </div>
      </section>

      {/* PREVIEW */}
      <section className="ggf-card overflow-hidden">
        <div className="ggf-card-header">
          <div>
            <h2>Preview Master Data</h2>

            <p>
              Menampilkan maksimal 10 baris pertama dari
              master karyawan aktif.
            </p>
          </div>

          <span className="ggf-section-number">
            03
          </span>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="px-4 py-3">No.</th>
                <th className="px-4 py-3">KIT</th>
                <th className="px-4 py-3">
                  Nama Lengkap
                </th>
                <th className="px-4 py-3">
                  Jenis Kelamin
                </th>
                <th className="px-4 py-3">Umur</th>
                <th className="px-4 py-3">SubDep</th>
                <th className="px-4 py-3">
                  Div / SubDiv
                </th>
                <th className="px-4 py-3">
                  Status Pekerja
                </th>
              </tr>
            </thead>

            <tbody>
              {workers.slice(0, 10).map((worker) => (
                <tr
                  key={`${worker.kit}-${worker.no}`}
                  className="border-b border-gray-50 last:border-0 dark:border-gray-800/70"
                >
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {worker.no}
                  </td>

                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                    {worker.kit}
                  </td>

                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {worker.namaLengkap}
                  </td>

                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {worker.jenisKelamin}
                  </td>

                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {worker.umur}
                  </td>

                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {worker.subDep}
                  </td>

                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {worker.divSubDiv}
                  </td>

                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {worker.statusPekerja}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <Link
            href="/"
            className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Lihat dashboard →
          </Link>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}