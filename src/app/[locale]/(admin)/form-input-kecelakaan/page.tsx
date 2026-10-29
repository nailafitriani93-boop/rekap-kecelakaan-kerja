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

type AccidentGrouping = {
  id: string;
  namaGrouping: string;
};

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

export default function FormInputKecelakaanPage() {
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

  const [groupingOptions, setGroupingOptions] = useState<AccidentGrouping[]>([]);
  const [newGroupingName, setNewGroupingName] = useState("");
  const [selectedGroupingToDelete, setSelectedGroupingToDelete] = useState("");
  const [showAddGrouping, setShowAddGrouping] = useState(false);
  const [groupingLoading, setGroupingLoading] = useState(false);
  const [groupingSearch, setGroupingSearch] = useState("");
  const [showGroupingDropdown, setShowGroupingDropdown] = useState(false);
  const [groupingNotification, setGroupingNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!groupingNotification) return;

    const timeout = window.setTimeout(() => {
      setGroupingNotification(null);
    }, 2800);

    return () => window.clearTimeout(timeout);
  }, [groupingNotification]);

  useEffect(() => {
    let cancelled = false;

    const loadGroupingOptions = async () => {
      try {
        const response = await fetch("/api/accident-groupings");

        if (!response.ok) {
          throw new Error("Gagal mengambil master grouping kecelakaan.");
        }

        const data = await response.json();

        if (!cancelled && Array.isArray(data)) {
          setGroupingOptions(data);
        }
      } catch (error) {
        console.error(error);
      }
    };

    void loadGroupingOptions();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const filteredGroupingOptions = useMemo(() => {
    const query = groupingSearch.trim().toLowerCase();

    return groupingOptions
      .filter((option) =>
        option.namaGrouping.toLowerCase().includes(query),
      )
      .sort((a, b) =>
        a.namaGrouping.localeCompare(b.namaGrouping),
      );
  }, [groupingOptions, groupingSearch]);

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

  const handleAddGrouping = async () => {
    const namaGrouping = newGroupingName.trim();

    if (!namaGrouping) {
      window.alert("Masukkan nama grouping kecelakaan.");
      return;
    }

    setGroupingLoading(true);
    setGroupingNotification(null);

    try {
      const response = await fetch("/api/accident-groupings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ namaGrouping }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Gagal menambahkan grouping kecelakaan.",
        );
      }

      const addedGrouping = result as AccidentGrouping;

      setGroupingOptions((current) => {
        const exists = current.some((item) => item.id === addedGrouping.id);

        if (exists) return current;

        return [...current, addedGrouping].sort((a, b) =>
          a.namaGrouping.localeCompare(b.namaGrouping),
        );
      });

      updateForm("grouping", addedGrouping.namaGrouping);
      setGroupingSearch(addedGrouping.namaGrouping);
      setShowGroupingDropdown(false);
      setSelectedGroupingToDelete("");
      setNewGroupingName("");
      setShowAddGrouping(false);

      setGroupingNotification({
        type: "success",
        message: "Grouping kecelakaan berhasil ditambahkan.",
      });
    } catch (error) {
      setGroupingNotification({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal menambahkan grouping kecelakaan.",
      });
    } finally {
      setGroupingLoading(false);
    }
  };

  const handleDeleteGrouping = async () => {
    if (!selectedGroupingToDelete) {
      window.alert("Pilih grouping yang ingin dihapus.");
      return;
    }

    const selectedGrouping = groupingOptions.find(
      (item) => item.id === selectedGroupingToDelete,
    );

    if (!selectedGrouping) {
      window.alert("Grouping yang dipilih tidak ditemukan.");
      return;
    }

    const confirmed = window.confirm(
      `Hapus grouping kecelakaan "${selectedGrouping.namaGrouping}"?`,
    );

    if (!confirmed) return;

    setGroupingLoading(true);
    setGroupingNotification(null);

    try {
      const response = await fetch("/api/accident-groupings", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: selectedGroupingToDelete }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Gagal menghapus grouping kecelakaan.",
        );
      }

      setGroupingOptions((current) =>
        current.filter((item) => item.id !== selectedGroupingToDelete),
      );

      if (form.grouping === selectedGrouping.namaGrouping) {
        updateForm("grouping", "");
        setGroupingSearch("");
      }

      setSelectedGroupingToDelete("");

      setGroupingNotification({
        type: "success",
        message: "Grouping kecelakaan berhasil dihapus.",
      });
    } catch (error) {
      setGroupingNotification({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal menghapus grouping kecelakaan.",
      });
    } finally {
      setGroupingLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedWorker) return;

    if (
      !form.grouping ||
      !groupingOptions.some(
        (option) => option.namaGrouping === form.grouping,
      )
    ) {
      window.alert("Pilih grouping kecelakaan dari daftar yang tersedia.");
      return;
    }

    if (!form.typeAccident) {
      window.alert("Pilih type of accident.");
      return;
    }

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
        setGroupingSearch("");
        setShowGroupingDropdown(false);
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

      {groupingNotification && (
        <div
          className="ggf-toast"
          role="status"
          aria-live="polite"
        >
          <div className="ggf-toast-check">
            {groupingNotification.type === "success" ? "✓" : "!"}
          </div>

          <div>
            <strong>
              {groupingNotification.type === "success"
                ? "Berhasil"
                : "Gagal"}
            </strong>
            <span>{groupingNotification.message}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Form Input Kecelakaan
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Input kejadian kecelakaan berdasarkan master data pekerja yang aktif.
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
                    const currentTime = form.waktu || "12:00";
                    const [hour, minute] = currentTime.split(":");

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
                            onClick={() => setTimePickerStep("hour")}
                            className={`text-4xl font-semibold leading-none transition ${
                              timePickerStep === "hour"
                                ? "text-white"
                                : "text-emerald-200"
                            }`}
                          >
                            {String(timePickerHour).padStart(2, "0")}
                          </button>

                          <span className="mb-1 text-3xl font-semibold text-white">
                            :
                          </span>

                          <button
                            type="button"
                            onClick={() => setTimePickerStep("minute")}
                            className={`text-4xl font-semibold leading-none transition ${
                              timePickerStep === "minute"
                                ? "text-white"
                                : "text-emerald-200"
                            }`}
                          >
                            {String(timePickerMinute).padStart(2, "0")}
                          </button>
                        </div>
                      </div>

                      {/* Clock */}
                      <div className="flex justify-center px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-6">
                        <div className="relative h-[240px] w-[240px] max-w-full">
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
                            ? Array.from({ length: 12 }, (_, index) => {
                                const hour = index + 1;
                                const angle =
                                  (hour * 30 - 90) * (Math.PI / 180);
                                const radius = 92;
                                const center = 120;
                                const left =
                                  center + Math.cos(angle) * radius;
                                const top =
                                  center + Math.sin(angle) * radius;
                                const selected = timePickerHour === hour;

                                return (
                                  <button
                                    key={hour}
                                    type="button"
                                    onClick={() => {
                                      setTimePickerHour(hour);
                                      setTimePickerStep("minute");
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
                              })
                            : Array.from({ length: 12 }, (_, index) => {
                                const minute = index * 5;
                                const angle =
                                  (minute * 6 - 90) * (Math.PI / 180);
                                const radius = 92;
                                const center = 120;
                                const left =
                                  center + Math.cos(angle) * radius;
                                const top =
                                  center + Math.sin(angle) * radius;
                                const selected = timePickerMinute === minute;

                                return (
                                  <button
                                    key={minute}
                                    type="button"
                                    onClick={() => {
                                      setTimePickerMinute(minute);
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
                                    {String(minute).padStart(2, "0")}
                                  </button>
                                );
                              })}

                          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
                              {timePickerStep === "hour" ? "JAM" : "MENIT"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
                        <button
                          type="button"
                          onClick={() => setShowTimePicker(false)}
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

                            updateForm("waktu", formattedTime);
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
                onChange={(e) => updateForm("lokasi", e.target.value)}
                className="ggf-input"
                placeholder="Masukkan lokasi kejadian"
                required
              />
            </Field>

            {/* Grouping Kecelakaan */}
            <Field label="Grouping Kecelakaan" required>
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={groupingSearch}
                    onChange={(e) => {
                      const value = e.target.value;

                      setGroupingSearch(value);
                      setShowGroupingDropdown(true);

                      const exactMatch = groupingOptions.find(
                        (item) =>
                          item.namaGrouping.toLowerCase() ===
                          value.trim().toLowerCase(),
                      );

                      updateForm("grouping", exactMatch?.namaGrouping ?? "");
                    }}
                    onFocus={() => setShowGroupingDropdown(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setShowGroupingDropdown(false);
                      }

                      if (
                        e.key === "Enter" &&
                        showGroupingDropdown &&
                        filteredGroupingOptions.length === 1
                      ) {
                        e.preventDefault();

                        const option = filteredGroupingOptions[0];

                        updateForm("grouping", option.namaGrouping);
                        setGroupingSearch(option.namaGrouping);
                        setShowGroupingDropdown(false);
                      }
                    }}
                    className="ggf-input min-w-0 w-full pr-12"
                    placeholder="Ketik untuk mencari grouping kecelakaan..."
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={showGroupingDropdown}
                    aria-controls="grouping-options-list"
                    aria-autocomplete="list"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => {
                      if (showGroupingDropdown) {
                        setShowGroupingDropdown(false);
                      } else {
                        if (groupingSearch === form.grouping) {
                          setGroupingSearch("");
                        }

                        setShowGroupingDropdown(true);
                      }
                    }}
                    aria-label={
                      showGroupingDropdown
                        ? "Tutup daftar grouping"
                        : "Buka daftar grouping"
                    }
                    title="Tampilkan daftar grouping"
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-gray-400 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform duration-200 ${
                        showGroupingDropdown ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>

                {showGroupingDropdown && (
                  <div
                    id="grouping-options-list"
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-900 dark:shadow-black/20"
                  >
                    {filteredGroupingOptions.length > 0 ? (
                      filteredGroupingOptions.map((option) => {
                        const isSelected =
                          form.grouping === option.namaGrouping;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              updateForm("grouping", option.namaGrouping);
                              setGroupingSearch(option.namaGrouping);
                              setShowGroupingDropdown(false);
                            }}
                            className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                              isSelected
                                ? "bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                            }`}
                          >
                            <span className="min-w-0 break-words">
                              {option.namaGrouping}
                            </span>

                            {isSelected && (
                              <svg
                                width="17"
                                height="17"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="shrink-0"
                                aria-hidden="true"
                              >
                                <path d="m5 12 4 4L19 6" />
                              </svg>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-4 text-center">
                        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-4-4" />
                          </svg>
                        </div>

                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Grouping tidak ditemukan
                        </p>

                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Coba kata kunci lain atau tambahkan grouping baru.
                        </p>
                      </div>
                    )}

                    <div className="sticky bottom-0 border-t border-gray-100 bg-white px-3 py-2 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                      {filteredGroupingOptions.length} grouping tersedia
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddGrouping((current) => !current);
                    setShowGroupingDropdown(false);
                  }}
                  aria-label="Tambah grouping kecelakaan"
                  title="Tambah grouping"
                  disabled={groupingLoading}
                  className="flex h-10 items-center gap-2 rounded-xl border border-emerald-200 px-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                >
                  <span className="text-lg leading-none">+</span>
                  <span>Tambah Grouping</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!form.grouping) {
                      window.alert("Pilih grouping yang ingin dihapus.");
                      return;
                    }

                    const selected = groupingOptions.find(
                      (item) => item.namaGrouping === form.grouping,
                    );

                    setSelectedGroupingToDelete(selected?.id ?? "");
                    setShowGroupingDropdown(false);
                  }}
                  aria-label="Pilih grouping untuk dihapus"
                  title="Pilih grouping untuk dihapus"
                  disabled={groupingLoading || groupingOptions.length === 0}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5M14 11v5" />
                  </svg>
                </button>
              </div>

              {showAddGrouping && (
                <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-900/60 dark:bg-emerald-900/10">
                  <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Tambah Grouping Kecelakaan
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      value={newGroupingName}
                      onChange={(e) => setNewGroupingName(e.target.value)}
                      className="ggf-input min-w-0 flex-1"
                      placeholder="Masukkan nama grouping baru"
                      maxLength={150}
                      disabled={groupingLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleAddGrouping();
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => void handleAddGrouping()}
                      disabled={groupingLoading}
                      className="rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Simpan
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAddGrouping(false);
                        setNewGroupingName("");
                      }}
                      disabled={groupingLoading}
                      className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {selectedGroupingToDelete && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50/70 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-900/10">
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-600 dark:text-gray-300">
                    Hapus:{" "}
                    {
                      groupingOptions.find(
                        (item) => item.id === selectedGroupingToDelete,
                      )?.namaGrouping
                    }
                  </span>

                  <button
                    type="button"
                    onClick={() => void handleDeleteGrouping()}
                    disabled={groupingLoading}
                    className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Hapus
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedGroupingToDelete("")}
                    disabled={groupingLoading}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Batal
                  </button>
                </div>
              )}
            </Field>

            <Field label="Status Rujuk" required>
              <div className="flex items-center gap-6">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.statusRujuk === "Ya"}
                    onChange={(e) =>
                      updateForm(
                        "statusRujuk",
                        e.target.checked ? "Ya" : "",
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    required={form.statusRujuk === ""}
                  />

                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Ya
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.statusRujuk === "Tidak"}
                    onChange={(e) =>
                      updateForm(
                        "statusRujuk",
                        e.target.checked ? "Tidak" : "",
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    required={form.statusRujuk === ""}
                  />

                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Tidak
                  </span>
                </label>
              </div>
            </Field>

            <Field label="Type Of Accident" required>
              <div className="flex items-center gap-6">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.typeAccident === "Work Related"}
                    onChange={(e) =>
                      updateForm(
                        "typeAccident",
                        e.target.checked ? "Work Related" : "",
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />

                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Work Related
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.typeAccident === "Non Work Related"}
                    onChange={(e) =>
                      updateForm(
                        "typeAccident",
                        e.target.checked ? "Non Work Related" : "",
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />

                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Non Work Related
                  </span>
                </label>
              </div>
            </Field>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Field label="Kronologi Kejadian" required>
              <textarea
                value={form.kronologi}
                onChange={(e) => updateForm("kronologi", e.target.value)}
                className="ggf-input min-h-36 resize-y py-3"
                placeholder="Jelaskan kronologi kejadian..."
                required
              />
            </Field>

            <Field label="Akibat" required>
              <textarea
                value={form.akibat}
                onChange={(e) => updateForm("akibat", e.target.value)}
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