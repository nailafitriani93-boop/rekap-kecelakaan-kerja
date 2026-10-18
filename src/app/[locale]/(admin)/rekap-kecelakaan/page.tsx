"use client";

import { useEffect, useMemo, useState } from "react";

import {
  workerData as fallbackWorkerData,
  type Worker,
} from "@/data/workerData";

import {
  type AccidentForm,
  type AccidentRecord,
} from "@/data/appData";

const GROUPING_OPTIONS = [
  "Terjepit benda",
  "Tertabrak/terbentur",
  "Tertimpa benda",
  "Paparan bahan kimia",
  "Kontak dengan objek/alat",
  "Paparan panas",
  "Terjatuh/terpeleset",
  "Tertusuk benda",
  "Di gigit binatang/serangga",
  "Terkena benda tajam",
  "Kecelakaan lalu lintas",
];

const EMPTY_FORM: AccidentForm = {
  tanggal: "",
  waktu: "",
  lokasi: "",
  grouping: "",
  kronologi: "",
  akibat: "",
  statusRujuk: "",
  typeAccident: "",
};

export default function RekapKecelakaanPage() {
  const [workers, setWorkers] = useState<Worker[]>(fallbackWorkerData);
  const [search, setSearch] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [form, setForm] = useState<AccidentForm>(EMPTY_FORM);
  const [showWorkerDetails, setShowWorkerDetails] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerStep, setTimePickerStep] = useState<"hour" | "minute">(
    "hour",
  );
  const [timePickerHour, setTimePickerHour] = useState(12);
  const [timePickerMinute, setTimePickerMinute] = useState(0);
  const [records, setRecords] = useState<AccidentRecord[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/workers").then(async (response) => {
        if (!response.ok) throw new Error("Gagal mengambil master data.");
        return response.json() as Promise<Worker[]>;
      }),

      fetch("/api/accidents").then(async (response) => {
        if (!response.ok) throw new Error("Gagal mengambil data kecelakaan.");
        return response.json() as Promise<AccidentRecord[]>;
      }),
    ])
      .then(([workerData, accidentData]) => {
        if (cancelled) return;

        if (Array.isArray(workerData)) {
          setWorkers(workerData);
        }

        if (Array.isArray(accidentData)) {
          setRecords(accidentData);
        }
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query || selectedWorker) return [];

    return workers
      .filter(
        (worker) =>
          worker.kit.toLowerCase().includes(query) ||
          worker.namaLengkap.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [search, selectedWorker, workers]);

  const chooseWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setSearch(worker.namaLengkap);
  };

  const clearWorker = () => {
    setSelectedWorker(null);
    setSearch("");
  };

  const updateForm = (field: keyof AccidentForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);

    const query = value.trim().toLowerCase();

    const exactMatches = workers.filter(
      (worker) =>
        worker.kit.toLowerCase() === query ||
        worker.namaLengkap.toLowerCase() === query,
    );

    if (exactMatches.length === 1 && query) {
      setSelectedWorker(exactMatches[0]);
    } else {
      setSelectedWorker(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedWorker) return;

    const record: AccidentRecord = {
      ...form,
      id: `${Date.now()}-${selectedWorker.kit}`,
      createdAt: new Date().toISOString(),
      worker: selectedWorker,
    };

    const saveAccident = async () => {
      try {
        const response = await fetch("/api/accidents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(record),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error || "Gagal menyimpan data kecelakaan.",
          );
        }

        setRecords((current) => [
          result as AccidentRecord,
          ...current,
        ]);

        setForm(EMPTY_FORM);
        setSaved(true);

        window.setTimeout(() => setSaved(false), 2800);
      } catch (error) {
        window.alert(
          error instanceof Error
            ? error.message
            : "Gagal menyimpan data kecelakaan.",
        );
      }
    };

    void saveAccident();

    setSaved(true);

    window.setTimeout(() => setSaved(false), 2800);
  };

  return (
    <div className="space-y-6">
      {saved && (
        <div className="ggf-toast" role="status">
          <div className="ggf-toast-check">✓</div>

          <div>
            <strong>Berhasil</strong>
            <span>Data kecelakaan berhasil disimpan.</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Rekap Kecelakaan Kerja
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Input kejadian berdasarkan master data pekerja yang aktif.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="ggf-card">
          <div className="ggf-card-header">
            <div>
              <h2>Data Pekerja</h2>

              <p>
                Cari berdasarkan KIT atau Nama Lengkap. Data identitas
                terisi otomatis dari Master Data.
              </p>
            </div>

            <span className="ggf-section-number">01</span>
          </div>

          <div className="relative mt-6">
            <label
              className="ggf-label"
              htmlFor="worker-search"
            >
              Cari KIT / Nama Lengkap <span>*</span>
            </label>

            <input
              id="worker-search"
              value={search}
              onChange={(event) =>
                handleSearchChange(event.target.value)
              }
              placeholder="Ketik KIT atau nama lengkap..."
              className="ggf-input"
              autoComplete="off"
              required
            />

            {searchResults.length > 0 && (
              <div className="ggf-search-results">
                {searchResults.map((worker) => (
                  <button
                    key={`${worker.kit}-${worker.no}`}
                    type="button"
                    onClick={() => chooseWorker(worker)}
                    className="ggf-search-result"
                  >
                    <span className="font-semibold text-gray-800 dark:text-white/90">
                      {worker.namaLengkap}
                    </span>

                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      KIT {worker.kit} · {worker.divSubDiv || "-"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {search.trim() &&
              !selectedWorker &&
              searchResults.length === 0 && (
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
                  Data KIT / Nama Lengkap tidak ditemukan.
                </div>
              )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Mobile: data utama */}
            <div className="sm:hidden">
              <ReadonlyField
                label="KIT"
                value={selectedWorker?.kit ?? "-"}
              />
            </div>

            <div className="sm:hidden">
              <ReadonlyField
                label="Nama Lengkap"
                value={selectedWorker?.namaLengkap ?? "-"}
              />
            </div>

            <div className="sm:hidden">
              <ReadonlyField
                label="SubDep"
                value={selectedWorker?.subDep ?? "-"}
              />
            </div>

            {/* Desktop */}
            <div className="hidden sm:block">
              <ReadonlyField
                label="KIT"
                value={selectedWorker?.kit ?? "-"}
              />
            </div>

            <div className="hidden sm:block">
              <ReadonlyField
                label="Nama Lengkap"
                value={selectedWorker?.namaLengkap ?? "-"}
              />
            </div>

            <div className="hidden sm:block">
              <ReadonlyField
                label="Jenis Kelamin"
                value={selectedWorker?.jenisKelamin ?? "-"}
              />
            </div>

            <div className="hidden sm:block">
              <ReadonlyField
                label="Umur"
                value={
                  selectedWorker
                    ? String(selectedWorker.umur)
                    : "-"
                }
              />
            </div>

            <div className="hidden sm:block">
              <ReadonlyField
                label="SubDep"
                value={selectedWorker?.subDep ?? "-"}
              />
            </div>

            <div className="hidden sm:block">
              <ReadonlyField
                label="Div / SubDiv"
                value={selectedWorker?.divSubDiv ?? "-"}
              />
            </div>

            <div className="hidden sm:block">
              <ReadonlyField
                label="Status Pekerja"
                value={selectedWorker?.statusPekerja ?? "-"}
              />
            </div>

            {/* Detail tambahan khusus mobile */}
            <div
              className={`sm:hidden ${
                showWorkerDetails ? "block" : "hidden"
              }`}
            >
              <ReadonlyField
                label="Jenis Kelamin"
                value={selectedWorker?.jenisKelamin ?? "-"}
              />
            </div>

            <div
              className={`sm:hidden ${
                showWorkerDetails ? "block" : "hidden"
              }`}
            >
              <ReadonlyField
                label="Umur"
                value={
                  selectedWorker
                    ? String(selectedWorker.umur)
                    : "-"
                }
              />
            </div>

            <div
              className={`sm:hidden ${
                showWorkerDetails ? "block" : "hidden"
              }`}
            >
              <ReadonlyField
                label="Div / SubDiv"
                value={selectedWorker?.divSubDiv ?? "-"}
              />
            </div>

            <div
              className={`sm:hidden ${
                showWorkerDetails ? "block" : "hidden"
              }`}
            >
              <ReadonlyField
                label="Status Pekerja"
                value={selectedWorker?.statusPekerja ?? "-"}
              />
            </div>
          </div>

          {/* Tombol detail hanya muncul di mobile */}
          <div className="mt-5 sm:hidden">
            <button
              type="button"
              onClick={() =>
                setShowWorkerDetails((current) => !current)
              }
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.99] dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
            >
              {showWorkerDetails
                ? "Sembunyikan Detail"
                : "Tampilkan Detail"}
            </button>
          </div>

          {selectedWorker && (
            <button
              type="button"
              onClick={clearWorker}
              className="mt-4 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Ganti pekerja
            </button>
          )}
        </section>

        <section className="ggf-card">
          <div className="ggf-card-header">
            <div>
              <h2>Detail Kecelakaan</h2>

              <p>
                Lengkapi informasi kejadian sesuai laporan kecelakaan.
              </p>
            </div>

            <span className="ggf-section-number">02</span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Field label="Tanggal" required>
              <div className="relative">
                <input
                  id="tanggal-kecelakaan"
                  type="date"
                  value={form.tanggal}
                  onChange={(e) =>
                    updateForm("tanggal", e.target.value)
                  }
                  className="ggf-input pr-12"
                  required
                />

                <button
                  type="button"
                  aria-label="Pilih tanggal"
                  onMouseDown={(e) => {
                    e.preventDefault();

                    const input = document.getElementById(
                      "tanggal-kecelakaan",
                    ) as HTMLInputElement & {
                      showPicker?: () => void;
                    };

                    if (input.showPicker) {
                      input.showPicker();
                    } else {
                      input.focus();
                    }
                  }}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-emerald-600 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="3"
                      y="4"
                      width="18"
                      height="18"
                      rx="2"
                    />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>
              </div>
            </Field>

            <Field label="Waktu" required>
              <div className="relative">
                <input
                  id="waktu-kecelakaan"
                  type="time"
                  value={form.waktu}
                  onChange={(e) =>
                    updateForm("waktu", e.target.value)
                  }
                  className="ggf-input pr-12"
                  required
                />

                <button
                  type="button"
                  aria-label="Pilih waktu"
                  onClick={() => {
                    const currentTime =
                      form.waktu || "12:00";

                    const [hour, minute] =
                      currentTime.split(":");

                    setTimePickerHour(Number(hour));
                    setTimePickerMinute(Number(minute));
                    setTimePickerStep("hour");
                    setShowTimePicker(true);
                  }}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-emerald-600 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 15 14" />
                  </svg>
                </button>

                {showTimePicker && (
                  <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                    onMouseDown={(e) => {
                      if (e.target === e.currentTarget) {
                        setShowTimePicker(false);
                      }
                    }}
                  >
                    <div
                      className="max-h-[calc(100dvh-24px)] w-full max-w-[360px] overflow-y-auto overflow-x-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div className="bg-emerald-600 px-6 py-5 text-white">
                        <p className="text-xs font-medium uppercase tracking-wider text-emerald-100">
                          Pilih Waktu
                        </p>

                        <div className="mt-2 flex items-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setTimePickerStep("hour")
                            }
                            className={`text-4xl font-semibold leading-none transition ${
                              timePickerStep === "hour"
                                ? "text-white"
                                : "text-emerald-200"
                            }`}
                          >
                            {String(timePickerHour).padStart(
                              2,
                              "0",
                            )}
                          </button>

                          <span className="mb-1 text-3xl font-semibold text-white">
                            :
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setTimePickerStep("minute")
                            }
                            className={`text-4xl font-semibold leading-none transition ${
                              timePickerStep === "minute"
                                ? "text-white"
                                : "text-emerald-200"
                            }`}
                          >
                            {String(timePickerMinute).padStart(
                              2,
                              "0",
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Clock */}
                      <div className="flex justify-center px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-6">
                        <div className="relative h-[240px] w-[240px] max-w-full sm:h-[280px] sm:w-[280px]">
                          <div className="absolute inset-0 rounded-full bg-emerald-50 dark:bg-gray-800" />

                          {/* Jarum */}
                          <div
                            className="absolute left-1/2 top-1/2 z-20 origin-bottom rounded-full bg-emerald-600 transition-transform duration-200 dark:bg-emerald-400"
                            style={{
                              width: "3px",
                              height: "76px",
                              transform: `translate(-50%, -100%) rotate(${
                                timePickerStep === "hour"
                                  ? timePickerHour * 30
                                  : timePickerMinute * 6
                              }deg)`,
                            }}
                          />

                          {/* Titik tengah */}
                          <div className="absolute left-1/2 top-1/2 z-30 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-600 shadow-sm dark:border-gray-800 dark:bg-emerald-400" />

                          {timePickerStep === "hour"
                            ? Array.from(
                                { length: 12 },
                                (_, index) => {
                                  const hour = index + 1;

                                  const angle =
                                    (hour * 30 - 90) *
                                    (Math.PI / 180);

                                  const radius = 92;
                                  const center = 120;

                                  const left =
                                    center +
                                    Math.cos(angle) *
                                      radius;

                                  const top =
                                    center +
                                    Math.sin(angle) *
                                      radius;

                                  const selected =
                                    timePickerHour === hour;

                                  return (
                                    <button
                                      key={hour}
                                      type="button"
                                      onClick={() => {
                                        setTimePickerHour(
                                          hour,
                                        );
                                        setTimePickerStep(
                                          "minute",
                                        );
                                      }}
                                      className={`absolute z-40 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                                        selected
                                          ? "bg-emerald-600 text-white shadow-md dark:bg-emerald-500"
                                          : "text-gray-700 hover:bg-emerald-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                      }`}
                                      style={{
                                        left: `${left}px`,
                                        top: `${top}px`,
                                      }}
                                    >
                                      {hour}
                                    </button>
                                  );
                                },
                              )
                            : Array.from(
                                { length: 12 },
                                (_, index) => {
                                  const minute = index * 5;

                                  const angle =
                                    (minute * 6 - 90) *
                                    (Math.PI / 180);

                                  const radius = 92;
                                  const center = 120;

                                  const left =
                                    center +
                                    Math.cos(angle) *
                                      radius;

                                  const top =
                                    center +
                                    Math.sin(angle) *
                                      radius;

                                  const selected =
                                    timePickerMinute ===
                                    minute;

                                  return (
                                    <button
                                      key={minute}
                                      type="button"
                                      onClick={() => {
                                        setTimePickerMinute(
                                          minute,
                                        );
                                      }}
                                      className={`absolute z-40 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                                        selected
                                          ? "bg-emerald-600 text-white shadow-md dark:bg-emerald-500"
                                          : "text-gray-700 hover:bg-emerald-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                      }`}
                                      style={{
                                        left: `${left}px`,
                                        top: `${top}px`,
                                      }}
                                    >
                                      {String(minute).padStart(
                                        2,
                                        "0",
                                      )}
                                    </button>
                                  );
                                },
                              )}

                          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
                              {timePickerStep === "hour"
                                ? "JAM"
                                : "MENIT"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
                        <button
                          type="button"
                          onClick={() =>
                            setShowTimePicker(false)
                          }
                          className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          Batal
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const formattedTime = `${String(
                              timePickerHour,
                            ).padStart(2, "0")}:${String(
                              timePickerMinute,
                            ).padStart(2, "0")}`;

                            updateForm(
                              "waktu",
                              formattedTime,
                            );

                            setShowTimePicker(false);
                          }}
                          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-95"
                        >
                          Pilih
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Field>

            <Field label="Lokasi" required>
              <input
                value={form.lokasi}
                onChange={(e) =>
                  updateForm("lokasi", e.target.value)
                }
                className="ggf-input"
                placeholder="Masukkan lokasi kejadian"
                required
              />
            </Field>

            <Field label="Grouping Kecelakaan" required>
              <select
                value={form.grouping}
                onChange={(e) =>
                  updateForm("grouping", e.target.value)
                }
                className="ggf-input"
                required
              >
                <option value="">
                  Pilih grouping kecelakaan
                </option>

                {GROUPING_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status Rujuk" required>
              <select
                value={form.statusRujuk}
                onChange={(e) =>
                  updateForm("statusRujuk", e.target.value)
                }
                className="ggf-input"
                required
              >
                <option value="">
                  Pilih status rujuk
                </option>
                <option value="Ya">Ya</option>
                <option value="Tidak">Tidak</option>
              </select>
            </Field>

            <Field label="Type Of Accident" required>
              <select
                value={form.typeAccident}
                onChange={(e) =>
                  updateForm("typeAccident", e.target.value)
                }
                className="ggf-input"
                required
              >
                <option value="">
                  Pilih type of accident
                </option>
                <option value="Work Related">
                  Work Related
                </option>
                <option value="Non Work Related">
                  Non Work Related
                </option>
              </select>
            </Field>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Field label="Kronologi Kejadian" required>
              <textarea
                value={form.kronologi}
                onChange={(e) =>
                  updateForm("kronologi", e.target.value)
                }
                className="ggf-input min-h-36 resize-y py-3"
                placeholder="Jelaskan kronologi kejadian..."
                required
              />
            </Field>

            <Field label="Akibat" required>
              <textarea
                value={form.akibat}
                onChange={(e) =>
                  updateForm("akibat", e.target.value)
                }
                className="ggf-input min-h-36 resize-y py-3"
                placeholder="Tuliskan akibat / cedera yang terjadi..."
                required
              />
            </Field>
          </div>

          <div className="mt-6 flex justify-end border-t border-gray-100 pt-5 dark:border-gray-800">
            <button
              type="submit"
              disabled={!selectedWorker}
              className="ggf-submit"
            >
              Simpan Data Kecelakaan
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="ggf-label">
        {label} {required && <span>*</span>}
      </label>
      {children}
    </div>
  );
}

function ReadonlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <label className="ggf-label">{label}</label>
      <div className="ggf-readonly">{value || "-"}</div>
    </div>
  );
}