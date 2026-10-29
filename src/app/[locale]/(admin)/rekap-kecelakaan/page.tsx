"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Eye, Pencil, Trash2, X } from "lucide-react";
import type { AccidentRecord } from "@/data/appData";
import { Link } from "@/i18n/navigation";

type FormData = {
  kit: string;
  tanggal: string;
  waktu: string;
  lokasi: string;
  grouping: string;
  kronologi: string;
  akibat: string;
  statusRujuk: string;
  typeAccident: string;
};

const emptyForm: FormData = {
  kit: "",
  tanggal: "",
  waktu: "",
  lokasi: "",
  grouping: "",
  kronologi: "",
  akibat: "",
  statusRujuk: "",
  typeAccident: "",
};

const inputClass =
  "w-full min-w-0 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

const buttonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

function tambahBulan(tanggal: string | undefined, jumlahBulan: number) {
  if (!tanggal) return "-";

  const bagian = tanggal.slice(0, 10).split("-").map(Number);

  if (bagian.length !== 3 || bagian.some((angka) => !Number.isFinite(angka))) {
    return "-";
  }

  const [tahun, bulan, hari] = bagian;

  if (!tahun || !bulan || !hari) return "-";

  const indeksBulan = tahun * 12 + (bulan - 1) + jumlahBulan;
  const tahunTujuan = Math.floor(indeksBulan / 12);
  const bulanTujuan = ((indeksBulan % 12) + 12) % 12;

  const hariTerakhir = new Date(
    Date.UTC(tahunTujuan, bulanTujuan + 1, 0)
  ).getUTCDate();

  const tanggalTujuan = new Date(
    Date.UTC(
      tahunTujuan,
      bulanTujuan,
      Math.min(hari, hariTerakhir)
    )
  );

  return tanggalTujuan.toISOString().slice(0, 10);
}  

export default function RekapKecelakaanPage() {
  const [records, setRecords] = useState<AccidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const [detail, setDetail] = useState<AccidentRecord | null>(null);
  const [editing, setEditing] = useState<AccidentRecord | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [hkoRecord, setHkoRecord] = useState<AccidentRecord | null>(null);
  const [selectedHkoRecord, setSelectedHkoRecord] = useState<AccidentRecord | null>(null);
  const hkoSectionRef = useRef<HTMLElement | null>(null);
  const [hkoForm, setHkoForm] = useState({
    tanggalMasuk: "",
    statusAktif: true,
    tanggalKunjungan1: "",
    tanggalKunjungan2: "",
    tanggalKunjungan3: "",
  });
  const [hkoSaving, setHkoSaving] = useState(false);

  useEffect(() => {
    if (!selectedHkoRecord) return;

    hkoSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedHkoRecord]);
  const [hkoError, setHkoError] = useState("");

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingRecord, setDeletingRecord] =
    useState<AccidentRecord | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/accidents", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Gagal mengambil data rekap kecelakaan."
        );
      }

      setRecords(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data rekap kecelakaan."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) =>
      [
        record.tanggal,
        record.waktu,
        record.lokasi,
        record.grouping,
        record.kronologi,
        record.akibat,
        record.statusRujuk,
        record.typeAccident,
        record.worker?.kit,
        record.worker?.namaLengkap,
        record.worker?.divSubDiv,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [records, search]);

  const beginEdit = (record: AccidentRecord) => {
    setDetail(null);
    setEditing(record);

    setForm({
      kit: record.worker?.kit || "",
      tanggal: record.tanggal || "",
      waktu: (record.waktu || "").slice(0, 5),
      lokasi: record.lokasi || "",
      grouping: record.grouping || "",
      kronologi: record.kronologi || "",
      akibat: record.akibat || "",
      statusRujuk: record.statusRujuk || "",
      typeAccident: record.typeAccident || "",
    });

    setError("");
    setNotice("");
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editing || saving) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/accidents/${encodeURIComponent(String(editing.id))}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            worker: {
              kit: form.kit,
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Gagal memperbarui data kecelakaan."
        );
      }

      setEditing(null);
      setNotice("Data kecelakaan berhasil diperbarui.");

      await loadRecords();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui data kecelakaan."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (record: AccidentRecord) => {
  if (deletingId !== null) return;

  setDeletingId(String(record.id));
  setError("");
  setNotice("");

  try {
    const response = await fetch(
      `/api/accidents?id=${encodeURIComponent(String(record.id))}`,
      {
        method: "DELETE",
        cache: "no-store",
      }
    );

    const responseText = await response.text();

    let result: {
      success?: boolean;
      message?: string;
      error?: string;
    } = {};

    if (responseText.trim()) {
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Respons API bukan JSON (HTTP ${response.status}). ` +
          responseText.slice(0, 300)
        );
      }
    }

    if (!response.ok || result.success !== true) {
      throw new Error(
        result.error ||
          result.message ||
          `Gagal menghapus data kecelakaan (HTTP ${response.status}).`
      );
    }

    setRecords((previous) =>
      previous.filter(
        (item) => String(item.id) !== String(record.id)
      )
    );

    setDeletingRecord(null);
    setDetail(null);
    setEditing(null);
    setNotice(
      result.message || "Data kecelakaan berhasil dihapus."
    );
    setError("");
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Gagal menghapus data kecelakaan."
    );
  } finally {
    setDeletingId(null);
  }
};

  const setField = (key: keyof FormData, value: string) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const field = (
    label: string,
    key: keyof FormData,
    type = "text"
  ) => (
    <label className="block min-w-0 space-y-1" key={key}>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
        {label}
      </span>

      <input
        className={inputClass}
        type={type}
        value={form[key]}
        onChange={(event) => setField(key, event.target.value)}
      />
    </label>
  );

  const longField = (
    label: string,
    key: keyof FormData
  ) => (
    <label className="block min-w-0 space-y-1" key={key}>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
        {label}
      </span>

      <textarea
        className={`${inputClass} min-h-24 resize-y`}
        value={form[key]}
        onChange={(event) => setField(key, event.target.value)}
      />
    </label>
  );

  const showValue = (label: string, value: unknown) => (
    <div className="min-w-0" key={label}>
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {label}
      </div>

      <div className="mt-1 break-words text-sm font-medium text-gray-800 dark:text-gray-100">
        {String(value || "-")}
      </div>
    </div>
  );

  const closeDialog = () => {
    if (saving || deletingId !== null) return;

    setDetail(null);
    setEditing(null);
    setError("");
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* HEADER */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Data Rekap Kecelakaan
          </h1>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Daftar kejadian kecelakaan kerja yang tersimpan di PostgreSQL.
          </p>
        </div>

        <Link
          href="/form-input-kecelakaan"
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-green-700 px-3 py-2 text-xs font-medium text-white hover:bg-green-800"
        >
          + Input Kecelakaan
        </Link>
      </div>

      {/* DAFTAR DATA */}
      <section className="ggf-card min-w-0 space-y-3 !p-3 sm:!p-4">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Daftar Data Kecelakaan
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Total {filtered.length} kejadian
            </p>
          </div>

          <div className="flex min-w-0 flex-1 gap-2 sm:max-w-md">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari KIT, nama, lokasi..."
              aria-label="Cari data kecelakaan"
              className={inputClass}
            />

            <button
              type="button"
              onClick={() => void loadRecords()}
              disabled={loading}
              className={`${buttonClass} shrink-0 border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5`}
            >
              {loading ? "Memuat..." : "Muat ulang"}
            </button>
          </div>
        </div>

        {error && !detail && !editing && (
          <div
            role="alert"
            className="break-words rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
          >
            {notice}
          </div>
        )}

        {/* TABEL RINGKAS */}
        <div className="w-full min-w-0 max-h-[340px] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full min-w-[700px] table-fixed border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <tr>
                <th className="w-10 px-2 py-2.5 font-semibold">No.</th>
                <th className="w-24 px-2 py-2.5 font-semibold">Tanggal</th>
                <th className="w-16 px-2 py-2.5 font-semibold">Waktu</th>
                <th className="w-24 px-2 py-2.5 font-semibold">KIT</th>
                <th className="px-2 py-2.5 font-semibold">Nama Pekerja</th>
                <th className="w-28 px-2 py-2.5 font-semibold">Lokasi</th>
                <th className="w-24 px-2 py-2.5 font-semibold">Tipe</th>
                <th className="w-14 px-2 py-2.5 text-center font-semibold">
                  Detail
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-gray-500"
                  >
                    Memuat data kecelakaan...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-gray-500"
                  >
                    {error
                      ? "Data belum dapat ditampilkan."
                      : "Belum ada data kecelakaan."}
                  </td>
                </tr>
              ) : (
                filtered.map((record, index) => (
                  <tr
                    key={record.id}
                    className="text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-2 py-2.5">{index + 1}</td>

                    <td className="px-2 py-2.5">
                      {record.tanggal || "-"}
                    </td>

                    <td className="px-2 py-2.5">
                      {record.waktu || "-"}
                    </td>

                    <td
                      className="truncate px-2 py-2.5"
                      title={record.worker?.kit || "-"}
                    >
                      {record.worker?.kit || "-"}
                    </td>

                    <td className="truncate px-2 py-2.5 font-medium" title={record.worker?.namaLengkap || "-"}>
                      <button
                        type="button"
                        className="text-left text-green-700 underline-offset-2 hover:underline dark:text-green-400"
                        title="Klik untuk membuka dan mengedit data HKO"
                        onClick={() => {
                          setSelectedHkoRecord(record);
                        }}
                      >
                        {record.worker?.namaLengkap || "-"}
                      </button>
                    </td>

                    <td
                      className="truncate px-2 py-2.5"
                      title={record.lokasi || "-"}
                    >
                      {record.lokasi || "-"}
                    </td>

                    <td
                      className="truncate px-2 py-2.5"
                      title={record.typeAccident || "-"}
                    >
                      {record.typeAccident || "-"}
                    </td>

                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        title="Lihat detail kecelakaan"
                        aria-label={`Lihat detail kecelakaan ${record.worker?.namaLengkap || ""}`}
                        onClick={() => {
                          setError("");
                          setNotice("");
                          setDetail(record);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/10"
                      >
                        <Eye size={16} strokeWidth={1.8} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Klik nama karyawan untuk membuka dan mengedit data HKO. Klik ikon mata untuk melihat detail lengkap, mengedit, atau menghapus data kecelakaan.
        </p>
      </section>

      {/* TABEL HKO MUNCUL SETELAH NAMA KARYAWAN DIKLIK */}
      {selectedHkoRecord && (
        <section ref={hkoSectionRef} className="ggf-card min-w-0 space-y-3 !p-3 sm:!p-4 scroll-mt-4">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Data HKO Karyawan</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {selectedHkoRecord.worker?.namaLengkap || "-"} · KIT {selectedHkoRecord.worker?.kit || "-"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={`${buttonClass} bg-green-700 text-white hover:bg-green-800`}
                onClick={() => {
                  setHkoRecord(selectedHkoRecord);
                  setHkoForm({
                    tanggalMasuk: selectedHkoRecord.tanggalMasuk || "",
                    statusAktif: Boolean((selectedHkoRecord.worker as unknown as { aktif?: boolean })?.aktif ?? true),
                    tanggalKunjungan1: selectedHkoRecord.tanggalKunjungan1 || "",
                    tanggalKunjungan2: selectedHkoRecord.tanggalKunjungan2 || "",
                    tanggalKunjungan3: selectedHkoRecord.tanggalKunjungan3 || "",
                  });
                  setHkoError("");
                }}
              >
                <Pencil size={14} /> Edit HKO
              </button>
              <button
                type="button"
                className={`${buttonClass} border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200`}
                onClick={() => setSelectedHkoRecord(null)}
              >
                <X size={14} /> Tutup
              </button>
            </div>
          </div>
          <div className="w-full min-w-0 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[850px] border-collapse text-left text-xs">
              <thead className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Tanggal Masuk Karyawan</th>
                  <th className="px-3 py-2.5 font-semibold">Status Karyawan</th>
                  <th className="px-3 py-2.5 font-semibold">Target 6 Bulan</th>
                  <th className="px-3 py-2.5 font-semibold">Kunjungan Aktual 1</th>
                  <th className="px-3 py-2.5 font-semibold">Target 12 Bulan</th>
                  <th className="px-3 py-2.5 font-semibold">Kunjungan Aktual 2</th>
                  <th className="px-3 py-2.5 font-semibold">Target 18 Bulan</th>
                  <th className="px-3 py-2.5 font-semibold">Kunjungan Aktual 3</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-gray-700 dark:text-gray-300">
                  <td className="px-3 py-3">{selectedHkoRecord.tanggalMasuk || "Belum diisi"}</td>
                  <td className="px-3 py-3">{Boolean((selectedHkoRecord.worker as unknown as { aktif?: boolean })?.aktif ?? true) ? "Aktif" : "Tidak Aktif"}</td>
                  <td className="px-3 py-3">{tambahBulan(selectedHkoRecord.tanggal, 6)}</td>
                  <td className="px-3 py-3">{selectedHkoRecord.tanggalKunjungan1 || "Belum diisi"}</td>
                  <td className="px-3 py-3">{tambahBulan(selectedHkoRecord.tanggal, 12)}</td>
                  <td className="px-3 py-3">{selectedHkoRecord.tanggalKunjungan2 || "Belum diisi"}</td>
                  <td className="px-3 py-3">{tambahBulan(selectedHkoRecord.tanggal, 18)}</td>
                  <td className="px-3 py-3">{selectedHkoRecord.tanggalKunjungan3 || "Belum diisi"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* POP-UP DETAIL DAN EDIT */}
      {(detail || editing) && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDialog();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="accident-dialog-title"
            className="my-auto max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-4 shadow-xl dark:bg-gray-950 sm:p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
              <div className="min-w-0">
                <h2
                  id="accident-dialog-title"
                  className="text-base font-semibold text-gray-900 dark:text-white"
                >
                  {editing
                    ? "Edit Data Kecelakaan"
                    : "Detail Data Kecelakaan"}
                </h2>

                <p className="mt-1 break-words text-xs text-gray-500 dark:text-gray-400">
                  ID Data: {(editing || detail)?.id ?? "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={saving || deletingId !== null}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
                aria-label="Tutup"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {editing ? (
              <form onSubmit={saveEdit} className="space-y-4">
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  {field("KIT Pekerja", "kit")}
                  {field("Tanggal", "tanggal", "date")}
                  {field("Waktu", "waktu", "time")}
                  {field("Lokasi", "lokasi")}
                  {field("Grouping", "grouping")}
                  {field("Tipe Kecelakaan", "typeAccident")}
                  {field("Status Rujuk", "statusRujuk")}
                  {field("Akibat", "akibat")}
                </div>

                {longField("Kronologi", "kronologi")}

                {error && (
                  <p
                    role="alert"
                    className="break-words text-xs text-red-600 dark:text-red-400"
                  >
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setEditing(null);
                      setError("");
                    }}
                    className={`${buttonClass} border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200`}
                  >
                    Batal
                  </button>

                  <button
                    disabled={saving}
                    type="submit"
                    className={`${buttonClass} bg-brand-500 text-white hover:bg-brand-600`}
                  >
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            ) : (
              detail && (
                <>
                  {error && (
                    <div
                      role="alert"
                      className="mb-4 break-words rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                    >
                      {error}
                    </div>
                  )}

                  <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {showValue("Tanggal", detail.tanggal)}
                    {showValue("Waktu", detail.waktu)}
                    {showValue("KIT", detail.worker?.kit)}
                    {showValue("Nama Lengkap", detail.worker?.namaLengkap)}
                    {showValue("Div / SubDiv", detail.worker?.divSubDiv)}
                    {showValue("Jenis Kelamin", detail.worker?.jenisKelamin)}
                    {showValue("Umur", detail.worker?.umur)}
                    {showValue("Status Pekerja", detail.worker?.statusPekerja)}
                    {showValue("Lokasi", detail.lokasi)}
                    {showValue("Grouping", detail.grouping)}
                    {showValue("Tipe Kecelakaan", detail.typeAccident)}
                    {showValue("Status Rujuk", detail.statusRujuk)}
                    {showValue("Akibat", detail.akibat)}
                    {showValue(
  "HKO Hilang",
  detail.hkoHilang === null || detail.hkoHilang === undefined
    ? "Belum diisi"
    : `${detail.hkoHilang} hari`
)}

{showValue(
  "Tanggal Masuk Kerja",
  detail.tanggalMasuk || "Belum diisi"
)}

{String(detail.worker?.statusPekerja ?? "")
  .trim()
  .toLowerCase()
  .includes("staff") ? (
  <div className="sm:col-span-2 lg:col-span-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/30">
    <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
      Jadwal Kunjungan HKO Dihentikan
    </div>
    <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">
      Status pekerja adalah Staff. Target kunjungan 6, 12, dan 18 bulan tidak lagi dijadwalkan.
    </div>
  </div>
) : (
  <>
    {showValue(
      "Target Kunjungan 1 (6 Bulan)",
      tambahBulan(detail.tanggal, 6)
    )}

    {showValue(
      "Target Kunjungan 2 (12 Bulan)",
      tambahBulan(detail.tanggal, 12)
    )}

    {showValue(
      "Target Kunjungan 3 (18 Bulan)",
      tambahBulan(detail.tanggal, 18)
    )}
  </>
)}

{showValue(
  "Tanggal Kunjungan Aktual 1",
  detail.tanggalKunjungan1 || "Belum diisi"
)}

{showValue(
  "Tanggal Kunjungan Aktual 2",
  detail.tanggalKunjungan2 || "Belum diisi"
)}

{showValue(
  "Tanggal Kunjungan Aktual 3",
  detail.tanggalKunjungan3 || "Belum diisi"
)}
                  </div>

                  <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Kronologi
                    </p>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-800 dark:text-gray-200">
                      {detail.kronologi || "-"}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setDeletingRecord(detail);
                      }}
                      disabled={deletingId !== null}
                      className={`${buttonClass} border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30`}
                    >
                      <Trash2 size={15} />
                      Hapus
                    </button>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={closeDialog}
                        className={`${buttonClass} border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200`}
                      >
                        Tutup
                      </button>

                      <button
                        type="button"
                        onClick={() => beginEdit(detail)}
                        className={`${buttonClass} bg-brand-500 text-white hover:bg-brand-600`}
                      >
                        <Pencil size={15} />
                        Edit Data
                      </button>
                    </div>
                  </div>
                </>
              )
            )}
          </section>
        </div>
      )}

      {/* POP-UP INPUT DAN EDIT HKO DARI NAMA KARYAWAN */}
      {hkoRecord && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !hkoSaving) setHkoRecord(null);
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="hko-dialog-title" className="my-auto max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-4 shadow-xl dark:bg-gray-950 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
              <div>
                <h2 id="hko-dialog-title" className="text-base font-semibold text-gray-900 dark:text-white">Data HKO Karyawan</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hkoRecord.worker?.namaLengkap || "-"} · KIT {hkoRecord.worker?.kit || "-"}</p>
              </div>
              <button type="button" disabled={hkoSaving} onClick={() => setHkoRecord(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800" aria-label="Tutup"><X size={18} /></button>
            </div>

            <form className="space-y-4" onSubmit={async (event) => {
              event.preventDefault();
              if (hkoSaving) return;
              setHkoSaving(true);
              setHkoError("");
              try {
                const response = await fetch("/api/hko", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    accidentId: hkoRecord.id,
                    tanggalMasuk: hkoForm.tanggalMasuk,
                    statusAktif: hkoForm.statusAktif,
                    tanggalKunjungan1: hkoForm.tanggalKunjungan1,
                    tanggalKunjungan2: hkoForm.tanggalKunjungan2,
                    tanggalKunjungan3: hkoForm.tanggalKunjungan3,
                  }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result?.error || "Gagal menyimpan data HKO.");
                await loadRecords();
                setSelectedHkoRecord((current) => current && current.id === hkoRecord.id
                  ? { ...current, tanggalMasuk: hkoForm.tanggalMasuk, tanggalKunjungan1: hkoForm.tanggalKunjungan1, tanggalKunjungan2: hkoForm.tanggalKunjungan2, tanggalKunjungan3: hkoForm.tanggalKunjungan3, worker: current.worker ? { ...current.worker, aktif: hkoForm.statusAktif } as typeof current.worker : current.worker }
                  : current);
                setHkoRecord(null);
              } catch (err) {
                setHkoError(err instanceof Error ? err.message : "Gagal menyimpan data HKO.");
              } finally {
                setHkoSaving(false);
              }
            }}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Tanggal Masuk Karyawan</span>
                  <input className={inputClass} type="date" value={hkoForm.tanggalMasuk} onClick={(event) => { if (typeof event.currentTarget.showPicker === "function") event.currentTarget.showPicker(); }} onChange={(event) => setHkoForm((prev) => ({ ...prev, tanggalMasuk: event.target.value }))} />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Status Karyawan</span>
                  <select className={inputClass} value={hkoForm.statusAktif ? "aktif" : "tidak_aktif"} onChange={(event) => setHkoForm((prev) => ({ ...prev, statusAktif: event.target.value === "aktif" }))}>
                    <option value="aktif">Aktif</option>
                    <option value="tidak_aktif">Tidak Aktif</option>
                  </select>
                </label>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">Tanggal Kunjungan Aktual HKO</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {([1, 2, 3] as const).map((visit) => {
                    const key = `tanggalKunjungan${visit}` as "tanggalKunjungan1" | "tanggalKunjungan2" | "tanggalKunjungan3";
                    return (
                      <label key={visit} className="block space-y-1">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Kunjungan {visit} ({visit * 6} bulan)</span>
                        <input className={inputClass} type="date" value={hkoForm[key]} onClick={(event) => { if (typeof event.currentTarget.showPicker === "function") event.currentTarget.showPicker(); }} onChange={(event) => setHkoForm((prev) => ({ ...prev, [key]: event.target.value }))} />
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">Target berdasarkan tanggal kecelakaan: {tambahBulan(hkoRecord.tanggal, 6)} / {tambahBulan(hkoRecord.tanggal, 12)} / {tambahBulan(hkoRecord.tanggal, 18)}.</p>
              </div>

              {!hkoForm.statusAktif && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">Status karyawan Tidak Aktif. Jadwal HKO dapat tetap dilihat dan riwayat kunjungan tidak dihapus.</p>}
              {hkoError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{hkoError}</p>}
              <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                <button type="button" disabled={hkoSaving} onClick={() => setHkoRecord(null)} className={`${buttonClass} border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200`}>Batal</button>
                <button type="submit" disabled={hkoSaving} className={`${buttonClass} bg-brand-500 text-white hover:bg-brand-600`}>{hkoSaving ? "Menyimpan..." : "Simpan Data HKO"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* KONFIRMASI PENGHAPUSAN */}
      {deletingRecord && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-accident-title"
            aria-describedby="delete-accident-description"
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl dark:bg-gray-950 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <Trash2 size={21} />
              </div>

              <div className="min-w-0 flex-1">
                <h2
                  id="delete-accident-title"
                  className="text-base font-semibold text-gray-900 dark:text-white"
                >
                  Konfirmasi Hapus Data
                </h2>

                <p
                  id="delete-accident-description"
                  className="mt-2 break-words text-sm leading-6 text-gray-600 dark:text-gray-300"
                >
                  Apakah Anda yakin ingin menghapus data kecelakaan berikut?
                </p>

                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                  <p className="break-words text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {deletingRecord.worker?.namaLengkap ||
                      deletingRecord.worker?.kit ||
                      "Data kecelakaan"}
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    KIT: {deletingRecord.worker?.kit || "-"}
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Tanggal: {deletingRecord.tanggal || "Tidak diketahui"}
                  </p>
                </div>

                <p className="mt-3 text-xs text-red-600 dark:text-red-400">
                  Data yang telah dihapus tidak dapat dikembalikan.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                disabled={deletingId !== null}
                className={`${buttonClass} border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800`}
              >
                Tidak, Batal
              </button>

              <button
                type="button"
                onClick={() => void deleteRecord(deletingRecord)}
                disabled={deletingId !== null}
                className={`${buttonClass} bg-red-600 text-white hover:bg-red-700`}
              >
                <Trash2 size={14} />
                {deletingId === String(deletingRecord.id)
                  ? "Menghapus..."
                  : "Ya, Hapus"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}