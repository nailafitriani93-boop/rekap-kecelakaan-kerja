"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  workerData as fallbackWorkerData,
  type Worker,
} from "@/data/workerData";
import { type AccidentRecord } from "@/data/appData";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const PIE_COLORS = [
  "#B7DDB5",
  "#F6D98A",
  "#F5C39A",
  "#9CC8A8",
  "#C9D98A",
  "#F2C77D",
  "#A9D9C0",
  "#F2B99F",
  "#B7CFA7",
  "#E8D79B",
  "#9FC9B5",
];

function getRecordDate(record: AccidentRecord) {
  if (record.tanggal) {
    return record.tanggal;
  }

  return record.createdAt?.slice(0, 10) || "";
}

function getRecordMonth(record: AccidentRecord) {
  const date = getRecordDate(record);
  const parsed = new Date(`${date}T00:00:00`);

  return Number.isNaN(parsed.getTime())
    ? -1
    : parsed.getMonth();
}

function getMonthYear(record: AccidentRecord) {
  const date = getRecordDate(record);
  const parsed = new Date(`${date}T00:00:00`);

  return Number.isNaN(parsed.getTime())
    ? "Tanggal tidak tersedia"
    : `${MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

function getRecordTimeValue(record: AccidentRecord) {
  if (!record.waktu) {
    return 0;
  }

  const parts = String(record.waktu)
    .split(":")
    .map(Number);

  const hour = parts[0] || 0;
  const minute = parts[1] || 0;
  const second = parts[2] || 0;

  return hour * 3600 + minute * 60 + second;
}

export default function DashboardPage() {
  const [workers, setWorkers] = useState<Worker[]>(
    fallbackWorkerData
  );

  const [records, setRecords] = useState<
    AccidentRecord[]
  >([]);

  const [selectedMonth, setSelectedMonth] =
    useState<number | null>(null);

  const [selectedYear, setSelectedYear] =
    useState<number | null>(null);

  const [selectedSubDep, setSelectedSubDep] =
    useState("all");

  const [subDepAnalysisMode, setSubDepAnalysisMode] =
    useState<"monthly" | "yearly">("monthly");

  const [filterYear, setFilterYear] =
    useState<string>("all");

  const [filterMonth, setFilterMonth] =
    useState<string>("all");

  const [filterDate, setFilterDate] =
    useState("");

  const [selectedPage, setSelectedPage] =
    useState(1);

  const [isExportMenuOpen, setIsExportMenuOpen] =
    useState(false);

  const [hoveredMonth, setHoveredMonth] =
    useState<number | null>(null);

  const [monthlyTooltipPosition, setMonthlyTooltipPosition] =
    useState({
      x: 0,
      y: 0,
    });

  const [hoveredDay, setHoveredDay] =
    useState<number | null>(null);

  const [dailyTooltipPosition, setDailyTooltipPosition] =
    useState({
      x: 0,
      y: 0,
    });

  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);

  const dateInputRef =
    useRef<HTMLInputElement>(null);

  const monthlyChartRef =
    useRef<HTMLDivElement>(null);

  const dailyChartRef =
    useRef<HTMLDivElement>(null);

  const selectedMonthSectionRef =
    useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const [workersResponse, accidentsResponse] =
          await Promise.all([
            fetch("/api/workers"),
            fetch("/api/accidents"),
          ]);

        if (!workersResponse.ok || !accidentsResponse.ok) {
          throw new Error("Gagal mengambil data dari PostgreSQL.");
        }

        const [workerData, accidentData] = await Promise.all([
          workersResponse.json() as Promise<Worker[]>,
          accidentsResponse.json() as Promise<AccidentRecord[]>,
        ]);

        if (cancelled) return;

        if (Array.isArray(workerData)) {
          setWorkers(workerData);
        }

        if (Array.isArray(accidentData)) {
          setRecords(accidentData);
        }
      } catch (error) {
        console.error(error);
      }
    };

    void refresh();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      selectedMonth === null ||
      !selectedMonthSectionRef.current
    ) {
      return;
    }

    const element =
      selectedMonthSectionRef.current;

    element.animate(
      [
        {
          opacity: 0,
          transform:
            "translateX(40px) scale(0.985)",
        },
        {
          opacity: 0.45,
          transform:
            "translateX(15px) scale(0.995)",
        },
        {
          opacity: 1,
          transform:
            "translateX(0) scale(1)",
        },
      ],
      {
        duration: 480,
        easing:
          "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      }
    );
  }, [selectedMonth]);

  const male = workers.filter(
    (worker) =>
      worker.jenisKelamin.toLowerCase() === "male"
  ).length;

  const female = workers.filter(
    (worker) =>
      worker.jenisKelamin.toLowerCase() === "female"
  ).length;

  const genderTotal = male + female;

  const malePercentage =
    genderTotal > 0
      ? (male / genderTotal) * 100
      : 0;

  const femalePercentage =
    genderTotal > 0
      ? (female / genderTotal) * 100
      : 0;

  const maleWorkers = workers.filter(
    (worker) =>
      worker.jenisKelamin.toLowerCase() === "male"
  );

  const maleAverageAge = maleWorkers.length
    ? Math.round(
        (maleWorkers.reduce(
          (sum, worker) =>
            sum + Number(worker.umur || 0),
          0
        ) /
          maleWorkers.length) *
          10
      ) / 10
    : 0;

  const femaleWorkers = workers.filter(
    (worker) =>
      worker.jenisKelamin.toLowerCase() ===
      "female"
  );

  const femaleAverageAge =
    femaleWorkers.length
      ? Math.round(
          (femaleWorkers.reduce(
            (sum, worker) =>
              sum + Number(worker.umur || 0),
            0
          ) /
            femaleWorkers.length) *
            10
        ) / 10
      : 0;

  const averageAge = workers.length
    ? Math.round(
        (workers.reduce(
          (sum, worker) =>
            sum + Number(worker.umur || 0),
          0
        ) /
          workers.length) *
          10
      ) / 10
    : 0;

  const years = useMemo(() => {
    const unique = new Set(
      records
        .map((record) =>
          Number(
            getRecordDate(record).slice(0, 4)
          )
        )
        .filter(Boolean)
    );

    const currentYear =
      new Date().getFullYear();

    if (!unique.size) {
      unique.add(currentYear);
    }

    return Array.from(unique).sort(
      (a, b) => b - a
    );
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const date = getRecordDate(record);

      const yearMatches =
        filterYear === "all" ||
        date.startsWith(filterYear);

      const monthMatches =
        filterMonth === "all" ||
        getRecordMonth(record) ===
          Number(filterMonth);

      const dateMatches =
        !filterDate ||
        date === filterDate;

      return (
        yearMatches &&
        monthMatches &&
        dateMatches
      );
    });
  }, [
    records,
    filterYear,
    filterMonth,
    filterDate,
  ]);

  const workRelated =
    filteredRecords.filter(
      (record) =>
        record.typeAccident ===
        "Work Related"
    ).length;

  const referred =
    filteredRecords.filter(
      (record) =>
        record.statusRujuk === "Ya"
    ).length;

  const monthly = useMemo(() => {
    const currentYear =
      new Date().getFullYear();

    const year = filterDate
      ? Number(filterDate.slice(0, 4))
      : selectedYear ??
        (filterYear !== "all"
          ? Number(filterYear)
          : years[0] ?? currentYear);

    const source = filterDate
      ? records
      : records.filter(
          (record) =>
            Number(
              getRecordDate(record).slice(
                0,
                4
              )
            ) === year
        );

    const counts = MONTHS.map(
      (name, month) => ({
        month,
        label: name.slice(0, 3),
        count: source.filter(
          (record) =>
            getRecordMonth(record) ===
              month &&
            (!filterDate ||
              getRecordDate(record) ===
                filterDate)
        ).length,
      })
    );

    return {
      year,
      counts,
    };
  }, [
    records,
    filterDate,
    filterYear,
    selectedYear,
    years,
  ]);

  const selectedRecords = useMemo(() => {
    if (selectedMonth === null) {
      return [];
    }

    const year =
      selectedYear ?? monthly.year;

    return records
      .filter((record) => {
        const date = getRecordDate(record);

        return (
          getRecordMonth(record) ===
            selectedMonth &&
          Number(date.slice(0, 4)) === year
        );
      })
      .sort((a, b) => {
        const dateCompare =
          getRecordDate(b).localeCompare(
            getRecordDate(a)
          );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return (
          getRecordTimeValue(b) -
          getRecordTimeValue(a)
        );
      });
  }, [
    records,
    selectedMonth,
    selectedYear,
    monthly.year,
  ]);

  const selectedDateRecords = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return records
      .filter(
        (record) =>
          getRecordDate(record) ===
          selectedDate
      )
      .sort((a, b) => {
        return (
          getRecordTimeValue(b) -
          getRecordTimeValue(a)
        );
      });
  }, [records, selectedDate]);

  useEffect(() => {
    setSelectedPage(1);
  }, [
    selectedMonth,
    selectedYear,
    selectedDate,
  ]);

  useEffect(() => {
    if (selectedMonth === null) {
      setSelectedDate(null);
    }
  }, [selectedMonth]);

  const ITEMS_PER_PAGE = 5;

  const previewRecords = selectedDate
    ? selectedDateRecords
    : selectedRecords;

  const totalPages = Math.max(
    1,
    Math.ceil(
      previewRecords.length /
        ITEMS_PER_PAGE
    )
  );

  const currentPageRecords =
    previewRecords.slice(
      (selectedPage - 1) *
        ITEMS_PER_PAGE,
      selectedPage *
        ITEMS_PER_PAGE
    );

  const dailyCounts = useMemo(() => {
    if (selectedMonth === null) {
      return [];
    }

    const year =
      selectedYear ?? monthly.year;

    const dailyMap =
      new Map<number, number>();

    selectedRecords.forEach((record) => {
      const date = getRecordDate(record);

      const recordYear = Number(
        date.slice(0, 4)
      );

      const recordMonth =
        getRecordMonth(record);

      if (
        recordYear === year &&
        recordMonth === selectedMonth
      ) {
        const day = Number(
          date.slice(8, 10)
        );

        if (day) {
          dailyMap.set(
            day,
            (dailyMap.get(day) ?? 0) + 1
          );
        }
      }
    });

    return Array.from(dailyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, count]) => ({
        day,
        count,
      }));
  }, [
    selectedRecords,
    selectedMonth,
    selectedYear,
    monthly.year,
  ]);

  const groupingCounts = useMemo(
    () =>
      countBy(
        filteredRecords,
        (record) =>
          record.grouping ||
          "Tidak diisi"
      ),
    [filteredRecords]
  );

  const subDepOptions = useMemo(() => {
    return Array.from(
      new Set(
        workers
          .map((worker) =>
            String(worker.subDep || "").trim()
          )
          .filter(Boolean)
      )
    ).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [workers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Dashboard Rekap Kecelakaan Kerja
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Insight kecelakaan berdasarkan tanggal,
          lokasi, penyebab, dan grouping kejadian.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Data Pekerja"
          value={workers.length}
          note=""
        />

        <MetricCard
          label="Total Kecelakaan"
          value={filteredRecords.length}
          note=""
        />

        <MetricCard
          label="Work Related"
          value={workRelated}
          note=""
        />

        <MetricCard
          label="Status Rujuk: Ya"
          value={referred}
          note=""
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="ggf-card">
        <div className="ggf-card-header">
          <div>
            <h2>
              Kecelakaan Kerja Per Bulan
            </h2>

            <p>
              Klik batang bulan untuk melihat
              grafik kecelakaan per tanggal.
            </p>
          </div>

          <select
            value={monthly.year}
            onChange={(e) => {
              setSelectedYear(
                Number(e.target.value)
              );

              setFilterYear(
                e.target.value
              );

              setFilterMonth("all");
              setFilterDate("");
              setSelectedMonth(null);
              setSelectedDate(null);
              setSelectedPage(1);
            }}
            className="ggf-dashboard-select"
          >
            {years.map((year) => (
              <option
                key={year}
                value={year}
              >
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 overflow-x-auto pb-2">
          <div className="min-w-[760px] rounded-xl border border-gray-100 bg-gray-50/50 px-5 pb-4 pt-6 dark:border-gray-800 dark:bg-gray-900/20">
            <div
              ref={monthlyChartRef}
              className="relative h-[300px]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 bottom-10 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map(
                  (line) => (
                    <div
                      key={line}
                      className="border-t border-dashed border-gray-200 dark:border-gray-800"
                    />
                  )
                )}
              </div>

              <div className="relative flex h-full items-end gap-3">
                {monthly.counts.map(
                  (item) => {
                    const max = Math.max(
                      ...monthly.counts.map(
                        (entry) =>
                          entry.count
                      ),
                      1
                    );

                    const height =
                      Math.max(
                        (item.count /
                          max) *
                          100,
                        item.count
                          ? 7
                          : 2
                      );

                    const isSelected =
                      selectedMonth ===
                      item.month;

                    const isHovered =
                      hoveredMonth ===
                      item.month;

                    return (
                      <button
                        key={item.month}
                        type="button"
                        className="group relative flex h-full min-w-[48px] cursor-pointer flex-col items-center justify-end"
                        onMouseEnter={() =>
                          setHoveredMonth(
                            item.month
                          )
                        }
                        onMouseMove={(event) => {
                          const rect =
                            monthlyChartRef.current?.getBoundingClientRect();

                          if (!rect) {
                            return;
                          }

                          let x =
                            event.clientX -
                            rect.left +
                            18;

                          let y =
                            event.clientY -
                            rect.top -
                            76;

                          const tooltipWidth =
                            190;

                          const tooltipHeight =
                            64;

                          if (
                            x +
                              tooltipWidth >
                            rect.width
                          ) {
                            x =
                              event.clientX -
                              rect.left -
                              tooltipWidth -
                              18;
                          }

                          if (x < 0) {
                            x = 0;
                          }

                          if (
                            y < 0
                          ) {
                            y =
                              event.clientY -
                              rect.top +
                              18;
                          }

                          if (
                            y +
                              tooltipHeight >
                            rect.height
                          ) {
                            y =
                              rect.height -
                              tooltipHeight;
                          }

                          setMonthlyTooltipPosition({
                            x,
                            y,
                          });
                        }}
                        onMouseLeave={() =>
                          setHoveredMonth(null)
                        }
                        onClick={() => {
                          const isSame =
                            selectedMonth ===
                            item.month;

                          setSelectedMonth(
                            isSame
                              ? null
                              : item.month
                          );

                          setSelectedDate(
                            null
                          );

                          setSelectedYear(
                            monthly.year
                          );

                          setSelectedPage(1);
                        }}
                      >
                        <div className="relative flex h-[250px] w-full items-end justify-center">
                          <span
                            className="block w-full max-w-[28px] rounded-t-[6px] transition-all duration-200"
                            style={{
                              height: `${height}%`,
                              background:
                                isHovered ||
                                isSelected
                                  ? "#B8D8A8"
                                  : "#DDE8D6",
                              opacity:
                                isHovered ||
                                isSelected
                                  ? 1
                                  : 0.95,
                              transform:
                                isHovered
                                  ? "scaleX(1.12)"
                                  : "scaleX(1)",
                              boxShadow:
                                isHovered ||
                                isSelected
                                  ? "0 4px 10px rgba(22,132,63,0.18)"
                                  : "none",
                            }}
                          />
                        </div>

                        <span
                          className={`mt-3 text-xs font-medium transition-colors ${
                            isSelected
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              {hoveredMonth !== null && (
                <div
                  className="pointer-events-none absolute z-30 whitespace-nowrap rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-lg dark:bg-gray-800 dark:text-white"
                  style={{
                    left: `${monthlyTooltipPosition.x}px`,
                    top: `${monthlyTooltipPosition.y}px`,
                    transition:
                      "left 80ms ease-out, top 80ms ease-out",
                  }}
                >
                  <span className="block">
                    {
                      monthly.counts[
                        hoveredMonth
                      ].label
                    }
                    ,{" "}
                    {monthly.year}
                  </span>

                  <span className="mt-1 block text-sm text-gray-500 dark:text-gray-300">
                    Kecelakaan{" "}
                    <b className="text-gray-800 dark:text-white">
                      {
                        monthly.counts[
                          hoveredMonth
                        ].count
                      }
                    </b>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

  <div className="xl:col-span-1">
    <PieCard
      title="Kecelakaan Karena Apa?"
      subtitle="Proporsi penyebab berdasarkan grouping kecelakaan"
      items={Object.entries(
        groupingCounts
      ).sort(
        (a, b) => b[1] - a[1]
      )}
    />
  </div>
      </div>

      {selectedMonth !== null && (
        <section
          ref={selectedMonthSectionRef}
          className="ggf-card"
        >
          <div className="ggf-card-header">
            <div>
              <h2>
                Insight Kecelakaan Per Tanggal —{" "}
                {MONTHS[selectedMonth]}{" "}
                {selectedYear ??
                  monthly.year}
              </h2>

              <p>
                Grafik menampilkan jumlah
                kecelakaan pada setiap tanggal
                di bulan yang dipilih.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setIsExportMenuOpen((open) => !open)
                  }
                  className="ggf-close-filter inline-flex items-center gap-1.5"
                  aria-haspopup="menu"
                  aria-expanded={isExportMenuOpen}
                >
                  Export
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`transition-transform duration-200 ${
                      isExportMenuOpen ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {isExportMenuOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-48 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-md dark:border-gray-700 dark:bg-gray-900"
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        exportSelectedMonth(
                          selectedRecords,
                          selectedMonth,
                          selectedYear ?? monthly.year
                        );
                        setIsExportMenuOpen(false);
                      }}
                      className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5"
                    >
                      <span className="truncate">Bulan ini</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        exportAnnualReport(
                          records,
                          selectedYear ?? monthly.year
                        );
                        setIsExportMenuOpen(false);
                      }}
                      className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5"
                    >
                      <span className="truncate">Rekap tahunan</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedMonth(null);
                  setSelectedDate(null);
                  setSelectedPage(1);
                  setIsExportMenuOpen(false);
                }}
                className="ggf-close-filter"
              >
                Tutup
              </button>
            </div>
          </div>

          {dailyCounts.length > 0 && (
            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Kecelakaan Per Tanggal
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Klik bar untuk melihat data kecelakaan sesuai tanggal
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto pb-3">
                <div className="min-w-[700px] rounded-xl border border-gray-100 bg-gray-50/50 px-5 pb-4 pt-6 dark:border-gray-800 dark:bg-gray-900/20">
                  <div
                    ref={dailyChartRef}
                    className="relative h-[280px]"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 bottom-10 flex flex-col justify-between">
                      {[0, 1, 2, 3, 4].map(
                        (line) => (
                          <div
                            key={line}
                            className="border-t border-dashed border-gray-200 dark:border-gray-800"
                          />
                        )
                      )}
                    </div>

                    <div className="relative flex h-full items-end gap-2">
                      {dailyCounts.map(
                        (item) => {
                          const max =
                            Math.max(
                              ...dailyCounts.map(
                                (entry) =>
                                  entry.count
                              ),
                              1
                            );

                          const height =
                            Math.max(
                              (item.count /
                                max) *
                                100,
                              8
                            );

                          const dateValue = `${
                            selectedYear ??
                            monthly.year
                          }-${String(
                            selectedMonth + 1
                          ).padStart(
                            2,
                            "0"
                          )}-${String(
                            item.day
                          ).padStart(
                            2,
                            "0"
                          )}`;

                          const isHovered =
                            hoveredDay ===
                            item.day;

                          const isSelected =
                            selectedDate ===
                            dateValue;

                          return (
                            <div
                              key={item.day}
                              className="group relative flex h-full min-w-[34px] flex-1 flex-col items-center justify-end"
                              onMouseEnter={() =>
                                setHoveredDay(
                                  item.day
                                )
                              }
                              onMouseMove={(event) => {
                                const rect =
                                  dailyChartRef.current?.getBoundingClientRect();

                                if (!rect) {
                                  return;
                                }

                                let x =
                                  event.clientX -
                                  rect.left +
                                  18;

                                let y =
                                  event.clientY -
                                  rect.top -
                                  76;

                                const tooltipWidth =
                                  190;

                                const tooltipHeight =
                                  64;

                                if (
                                  x +
                                    tooltipWidth >
                                  rect.width
                                ) {
                                  x =
                                    event.clientX -
                                    rect.left -
                                    tooltipWidth -
                                    18;
                                }

                                if (x < 0) {
                                  x = 0;
                                }

                                if (
                                  y < 0
                                ) {
                                  y =
                                    event.clientY -
                                    rect.top +
                                    18;
                                }

                                if (
                                  y +
                                    tooltipHeight >
                                  rect.height
                                ) {
                                  y =
                                    rect.height -
                                    tooltipHeight;
                                }

                                setDailyTooltipPosition({
                                  x,
                                  y,
                                });
                              }}
                              onMouseLeave={() =>
                                setHoveredDay(null)
                              }
                            >
                              <div className="relative flex h-[230px] w-full items-end justify-center">
                                <button
                                  type="button"
                                  aria-label={`Lihat data kecelakaan tanggal ${String(
                                    item.day
                                  ).padStart(
                                    2,
                                    "0"
                                  )}`}
                                  onClick={() => {
                                    setSelectedDate(
                                      isSelected
                                        ? null
                                        : dateValue
                                    );

                                    setSelectedPage(
                                      1
                                    );
                                  }}
                                  className="w-full max-w-[28px] cursor-pointer rounded-t-[6px] transition-all duration-200"
                                  style={{
                                    height: `${height}%`,
                                    background:
                                      isHovered ||
                                      isSelected
                                        ? "#F2D58A"
                                        : "#E8DFC5",
                                    opacity:
                                      isHovered ||
                                      isSelected
                                        ? 1
                                        : 0.95,
                                    transform:
                                      isHovered ||
                                      isSelected
                                        ? "scaleX(1.12)"
                                        : "scaleX(1)",
                                    boxShadow:
                                      isHovered ||
                                      isSelected
                                        ? "0 4px 10px rgba(22,132,63,0.18)"
                                        : "none",
                                  }}
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDate(
                                    isSelected
                                      ? null
                                      : dateValue
                                  );

                                  setSelectedPage(
                                    1
                                  );
                                }}
                                className={`mt-3 cursor-pointer text-[11px] font-medium transition-colors ${
                                  isSelected
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-gray-500 dark:text-gray-400"
                                }`}
                              >
                                {item.day}
                              </button>
                            </div>
                          );
                        }
                      )}
                    </div>

                    {hoveredDay !== null && (
                      <div
                        className="pointer-events-none absolute z-30 whitespace-nowrap rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-lg dark:bg-gray-800 dark:text-white"
                        style={{
                          left: `${dailyTooltipPosition.x}px`,
                          top: `${dailyTooltipPosition.y}px`,
                          transition:
                            "left 80ms ease-out, top 80ms ease-out",
                        }}
                      >
                        <span className="block">
                          {String(
                            dailyCounts[
                              dailyCounts.findIndex(
                                (item) =>
                                  item.day ===
                                  hoveredDay
                              )
                            ]?.day ?? ""
                          ).padStart(
                            2,
                            "0"
                          )}{" "}
                          {MONTHS[
                            selectedMonth
                          ].slice(
                            0,
                            3
                          )}
                          ,{" "}
                          {selectedYear ??
                            monthly.year}
                        </span>

                        <span className="mt-1 block text-sm text-gray-500 dark:text-gray-300">
                          Kecelakaan{" "}
                          <b className="text-gray-800 dark:text-white">
                            {
                              dailyCounts[
                                dailyCounts.findIndex(
                                  (item) =>
                                    item.day ===
                                    hoveredDay
                                )
                              ]?.count
                            }
                          </b>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-7">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {selectedDate
                    ? `Data Kecelakaan Tanggal ${formatDate(
                        selectedDate
                      )}`
                    : "Preview Data"}
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedDate
                    ? "Menampilkan data kecelakaan berdasarkan tanggal yang dipilih."
                    : "Menampilkan 5 data terbaru per halaman."}
                </p>
              </div>

              {previewRecords.length >
                0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {previewRecords.length}{" "}
                  total data
                </span>
              )}
            </div>

            {previewRecords.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                        <th className="px-4 py-3">
                          Tanggal
                        </th>

                        <th className="px-4 py-3">
                          Waktu
                        </th>

                        <th className="px-4 py-3">
                          KIT
                        </th>

                        <th className="px-4 py-3">
                          Nama Lengkap
                        </th>

                        <th className="px-4 py-3">
                          SubDep
                        </th>

                        <th className="px-4 py-3">
                          Grouping
                        </th>

                        <th className="px-4 py-3">
                          Type
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {currentPageRecords.map(
                        (record) => (
                          <tr
                            key={record.id}
                            className="border-b border-gray-50 last:border-0 dark:border-gray-800/70"
                          >
                            <td className="px-4 py-4 font-medium text-gray-800 dark:text-white/90">
                              {formatDate(
                                getRecordDate(
                                  record
                                )
                              )}
                            </td>

                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                              {record.waktu}
                            </td>

                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                              {
                                record
                                  .worker
                                  .kit
                              }
                            </td>

                            <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                              {
                                record
                                  .worker
                                  .namaLengkap
                              }
                            </td>

                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                              {record.worker.subDep}
                            </td>

                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                              {
                                record.grouping
                              }
                            </td>

                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                              {
                                record.typeAccident
                              }
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={
                        selectedPage <= 1
                      }
                      onClick={() =>
                        setSelectedPage(
                          (page) =>
                            Math.max(
                              page - 1,
                              1
                            )
                        )
                      }
                      className="ggf-close-filter disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>

                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Halaman{" "}
                      <b>
                        {selectedPage}
                      </b>{" "}
                      dari{" "}
                      <b>
                        {totalPages}
                      </b>
                    </span>

                    <button
                      type="button"
                      disabled={
                        selectedPage >=
                        totalPages
                      }
                      onClick={() =>
                        setSelectedPage(
                          (page) =>
                            Math.min(
                              page + 1,
                              totalPages
                            )
                        )
                      }
                      className="ggf-close-filter disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyInsight
                text={
                  selectedDate
                    ? "Tidak ada data kecelakaan pada tanggal ini."
                    : "Tidak ada data kecelakaan pada bulan ini."
                }
              />
            )}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6">
        <div className="w-full">
          <InsightCard
            title={`Kecelakaan Kerja per ${
              subDepAnalysisMode === "monthly"
                ? "Bulan"
                : "Tahun"
            }`}
            subtitle="Tren kecelakaan berdasarkan SubDepartemen"
          >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Klik bulan untuk melihat departemen mana yang paling banyak mengalami kecelakaan
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSubDepAnalysisMode("monthly")
                    }
                    className={`ggf-dashboard-select cursor-pointer transition-colors ${
                      subDepAnalysisMode === "monthly"
                        ? "bg-[#16843f] text-white"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    Per Bulan
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSubDepAnalysisMode("yearly")
                    }
                    className={`ggf-dashboard-select cursor-pointer transition-colors ${
                      subDepAnalysisMode === "yearly"
                        ? "bg-[#16843f] text-white"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    Per Tahun
                  </button>
                </div>

                <select
                  value={selectedSubDep}
                  onChange={(e) =>
                    setSelectedSubDep(e.target.value)
                  }
                  className="ggf-dashboard-select w-[220px]"
                >
                  <option value="all">
                    Semua SubDepartemen
                  </option>

                  {subDepOptions.map((subDep) => (
                    <option
                      key={subDep}
                      value={subDep}
                    >
                      {subDep}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <SubDepartmentMonthlyChart
              records={records}
              selectedSubDep={selectedSubDep}
              subDepOptions={subDepOptions}
              analysisMode={subDepAnalysisMode}
            />
          </InsightCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <InsightCard
          title="Komposisi Jenis Kelamin"
          subtitle={`${workers.length} pekerja`}
        >
          <GenderPie
            male={male}
            female={female}
            malePercentage={
              malePercentage
            }
            femalePercentage={
              femalePercentage
            }
          />

          <div className="mt-6">
            <div className="ggf-insight-stat">
              <span>Male</span>

              <strong>{male}</strong>
            </div>

            <div className="ggf-progress">
              <span
                style={{
                  width: `${
                    workers.length
                      ? (male /
                          workers.length) *
                        100
                      : 0
                  }%`,
                  background: "#A8CDB5",
                }}
              />
            </div>

            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Rata-rata umur pria:{" "}
              <b>
                {maleAverageAge} tahun
              </b>
            </p>
          </div>

          <div className="mt-4">
            <div className="ggf-insight-stat">
              <span>Female</span>

              <strong>{female}</strong>
            </div>

            <div className="ggf-progress">
              <span
                style={{
                  width: `${
                    workers.length
                      ? (female /
                          workers.length) *
                        100
                      : 0
                  }%`,
                  background: "#E8B7C8",
                }}
              />
            </div>

            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Rata-rata umur wanita:{" "}
              <b>
                {femaleAverageAge} tahun
              </b>
            </p>
          </div>

          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Total rata-rata umur pekerja:{" "}
            <b>{averageAge}</b> tahun.
          </p>
        </InsightCard>

        <InsightCard
          title="Status Pekerja"
          subtitle="Berdasarkan master data"
        >
          <BarList
            items={Object.entries(
              countBy(
                workers,
                (worker) =>
                  worker.statusPekerja ||
                  "Tidak diisi"
              )
            )
              .sort(
                (a, b) => b[1] - a[1]
              )
              .slice(0, 6)}
            total={workers.length}
          />
        </InsightCard>
      </div>

      <section className="ggf-card">
        <div className="ggf-card-header">
          <div>
            <h2>Aksi Cepat</h2>

            <p>
              Kelola data tanpa masuk ke
              database.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/rekap-kecelakaan"
            className="ggf-action-card"
          >
            <span className="ggf-action-icon">
              +
            </span>

            <span>
              <b>
                Input Kecelakaan
              </b>

              <small>
                Buat rekap kejadian baru.
              </small>
            </span>
          </Link>

          <Link
            href="/master-data"
            className="ggf-action-card"
          >
            <span className="ggf-action-icon">
              ↑
            </span>

            <span>
              <b>
                Upload Master Data
              </b>

              <small>
                Ganti master dari file
                Excel.
              </small>
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(
        "id-ID",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      );
}

function countBy<T>(
  items: T[],
  getKey: (item: T) => string
) {
  return items.reduce<
    Record<string, number>
  >((acc, item) => {
    const key =
      getKey(item) || "Tidak diisi";

    acc[key] =
      (acc[key] ?? 0) + 1;

    return acc;
  }, {});
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <section className="ggf-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-800 dark:text-white/90">
            {value}
          </p>

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {note}
          </p>
        </div>

        <MetricCardIcon label={label} />
      </div>
    </section>
  );
}

function MetricCardIcon({
  label,
}: {
  label: string;
}) {
  if (
    label === "Master Data Pekerja" ||
    label === "Data Pekerja"
  ) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
        <svg
          width="23"
          height="23"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 21V19C16 16.7909 14.2091 15 12 15H6C3.79086 15 2 16.7909 2 19V21"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle
            cx="9"
            cy="7"
            r="4"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M22 21V19C22 17.1362 20.7252 15.5701 19 15.126"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M16 3.12598C17.7252 3.57006 19 5.13616 19 7C19 8.86384 17.7252 10.4299 16 10.874"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  if (label === "Total Kecelakaan") {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-400">
        <svg
          width="23"
          height="23"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10.3 3.3L2.8 16.3C2.03 17.63 2.99 19.3 4.53 19.3H19.47C21.01 19.3 21.97 17.63 21.2 16.3L13.7 3.3C12.93 1.97 11.07 1.97 10.3 3.3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M12 8V12.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle
            cx="12"
            cy="15.5"
            r="1"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }

  if (label === "Work Related") {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
        <svg
          width="23"
          height="23"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="3"
            y="7"
            width="18"
            height="13"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M3 12H21"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M10 12V14H14V12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400">
      <svg
        width="23"
        height="23"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 20V6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M2.5 20H21.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        <path
          d="M9 20V15H15V20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M10 8H14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        <path
          d="M12 6V10"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        <path
          d="M7.5 12H7.51"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M16.5 12H16.51"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function InsightCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="ggf-card">
      <div className="ggf-card-header">
        <div>
          <h2>{title}</h2>

          <p>{subtitle}</p>
        </div>
      </div>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}

function BarList({
  items,
  total,
}: {
  items: [string, number][];
  total: number;
}) {
  const hl =
    items.find(
      ([label]) =>
        label.trim().toLowerCase() ===
        "hl"
    )?.[1] ?? 0;

  const karyawanTetap =
    items.find(
      ([label]) =>
        label.trim().toLowerCase() ===
        "karyawan tetap"
    )?.[1] ?? 0;

  const hlPercentage =
    total > 0
      ? (hl / total) * 100
      : 0;

  const karyawanTetapPercentage =
    total > 0
      ? (karyawanTetap / total) * 100
      : 0;

  return (
    <div className="space-y-5">
      {/* Nilai masing-masing kategori */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">
            HL
          </div>

          <b className="text-sm text-gray-800 dark:text-white/90">
            {hl}
          </b>
        </div>

        <div className="text-right">
          <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">
            Karyawan Tetap
          </div>

          <b className="text-sm text-gray-800 dark:text-white/90">
            {karyawanTetap}
          </b>
        </div>
      </div>

      {/* Bar 100% */}
      <div className="relative">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700/40">
          {hlPercentage > 0 && (
            <div
              className="group relative h-full transition-all duration-300"
              style={{
                width: `${hlPercentage}%`,
                background: "#B8D8A8",
              }}
            >
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                HL — {hl} pekerja (
                {hlPercentage.toFixed(1)}%)
              </div>
            </div>
          )}

          {karyawanTetapPercentage > 0 && (
            <div
              className="group relative h-full transition-all duration-300"
              style={{
                width: `${karyawanTetapPercentage}%`,
                background: "#F2D58A",
              }}
            >
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                Karyawan Tetap —{" "}
                {karyawanTetap} pekerja (
                {karyawanTetapPercentage.toFixed(
                  1
                )}%)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keterangan kategori */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-[3px]"
            style={{
              background: "#B8D8A8",
            }}
          />

          <span className="text-xs text-gray-600 dark:text-gray-300">
            HL {hlPercentage.toFixed(0)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-[3px]"
            style={{
              background: "#F2D58A",
            }}
          />

          <span className="text-xs text-gray-600 dark:text-gray-300">
            Karyawan Tetap{" "}
            {karyawanTetapPercentage.toFixed(
              0
            )}
            %
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyInsight({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
      {text}
    </div>
  );
}

/* =====================================================
   GENDER PIE
   HANYA BAGIAN INI YANG DIREVISI
   TAMPILAN DAN TOOLTIP DISESUAIKAN DENGAN PieCard
   ===================================================== */

function GenderPie({
  male,
  female,
  malePercentage,
  femalePercentage,
}: {
  male: number;
  female: number;
  malePercentage: number;
  femalePercentage: number;
}) {
  const [
    hoveredIndex,
    setHoveredIndex,
  ] = useState<number | null>(null);

  const total = male + female;

  if (!total) {
    return (
      <div className="flex flex-col items-center">
        <div className="relative flex w-full justify-center">
          <div className="relative">
            <svg
              width="240"
              height="240"
              viewBox="0 0 240 240"
            >
              <circle
                cx="120"
                cy="120"
                r="90"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="28"
              />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  const maleAngle =
    (male / total) * 360;

  const femaleAngle =
    (female / total) * 360;

  const createArc = (
    startAngle: number,
    endAngle: number
  ) => {
    const centerX = 120;
    const centerY = 120;
    const radius = 90;

    const start =
      (Math.PI / 180) *
      (startAngle - 90);

    const end =
      (Math.PI / 180) *
      (endAngle - 90);

    const x1 =
      centerX +
      radius * Math.cos(start);

    const y1 =
      centerY +
      radius * Math.sin(start);

    const x2 =
      centerX +
      radius * Math.cos(end);

    const y2 =
      centerY +
      radius * Math.sin(end);

    const largeArcFlag =
      endAngle - startAngle > 180
        ? 1
        : 0;

    return [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");
  };

  const malePath = createArc(
    0,
    maleAngle
  );

  const femalePath = createArc(
    maleAngle,
    maleAngle + femaleAngle
  );

  const maleIsHovered =
    hoveredIndex === 0;

  const femaleIsHovered =
    hoveredIndex === 1;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex w-full justify-center">
        <div className="relative">
          <svg
            width="240"
            height="240"
            viewBox="0 0 240 240"
          >
            <circle
              cx="120"
              cy="120"
              r="90"
              fill="#F3F4F6"
            />

            <path
              d={malePath}
              fill="#A8CDB5"
              opacity={
                femaleIsHovered
                  ? 0.45
                  : 1
              }
              onMouseEnter={() =>
                setHoveredIndex(0)
              }
              onMouseLeave={() =>
                setHoveredIndex(null)
              }
              className="cursor-pointer transition-all duration-200"
              style={{
                transformOrigin:
                  "120px 120px",
                transform:
                  maleIsHovered
                    ? "scale(1.04)"
                    : "scale(1)",
              }}
            />

            <path
              d={femalePath}
              fill="#E8B7C8"
              opacity={
                maleIsHovered
                  ? 0.45
                  : 1
              }
              onMouseEnter={() =>
                setHoveredIndex(1)
              }
              onMouseLeave={() =>
                setHoveredIndex(null)
              }
              className="cursor-pointer transition-all duration-200"
              style={{
                transformOrigin:
                  "120px 120px",
                transform:
                  femaleIsHovered
                    ? "scale(1.04)"
                    : "scale(1)",
              }}
            />

            <circle
              cx="120"
              cy="120"
              r="62"
              fill="white"
            />

            <text
              x="120"
              y="114"
              textAnchor="middle"
              fontSize="13"
              fill="#6B7280"
            >
              Total
            </text>

            <text
              x="120"
              y="136"
              textAnchor="middle"
              fontSize="23"
              fontWeight="700"
              fill="#111827"
            >
              {total}
            </text>
          </svg>

          {hoveredIndex !== null && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-lg">
              {hoveredIndex === 0
                ? `Male — ${male} (${malePercentage.toFixed(
                    1
                  )}%)`
                : `Female — ${female} (${femalePercentage.toFixed(
                    1
                  )}%)`}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-[3px]"
            style={{
              background: "#A8CDB5",
            }}
          />

          <span className="text-xs text-gray-600 dark:text-gray-300">
            Male
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-[3px]"
            style={{
              background: "#E8B7C8",
            }}
          />

          <span className="text-xs text-gray-600 dark:text-gray-300">
            Female
          </span>
        </div>
      </div>
    </div>
  );
}

function PieCard({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: [string, number][];
}) {
  const [
    hoveredIndex,
    setHoveredIndex,
  ] = useState<number | null>(null);

  const total = items.reduce(
    (sum, [, value]) => sum + value,
    0
  );

  if (!total) {
    return (
      <InsightCard
        title={title}
        subtitle={subtitle}
      >
        <EmptyInsight
          text="Belum ada data kecelakaan."
        />
      </InsightCard>
    );
  }

  const radius = 82;
  const center = 120;
  const circumference =
    2 * Math.PI * radius;

  let accumulated = 0;

  const segments = items.map(
    ([label, value], index) => {
      const percentage =
        value / total;

      const dash =
        percentage *
        circumference;

      const gap = 3;

      const segment = {
        label,
        value,
        percentage,
        dash,
        offset:
          -accumulated +
          circumference / 4,
        index,
      };

      accumulated += dash;

      return segment;
    }
  );

  return (
    <InsightCard
      title={title}
      subtitle={subtitle}
    >
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg
            width="260"
            height="260"
            viewBox="0 0 240 240"
          >
            <circle
              cx="120"
              cy="120"
              r={radius}
              fill="none"
              stroke="#F3F4F6"
              strokeWidth="30"
            />

            {segments.map(
              (segment) => {
                const isHovered =
                  hoveredIndex ===
                  segment.index;

                return (
                  <circle
                    key={segment.label}
                    cx="120"
                    cy="120"
                    r={radius}
                    fill="none"
                    stroke={
                      PIE_COLORS[
                        segment.index %
                          PIE_COLORS.length
                      ]
                    }
                    strokeWidth={
                      isHovered
                        ? 34
                        : 30
                    }
                    strokeLinecap="butt"
                    strokeDasharray={`${Math.max(
                      segment.dash - 3,
                      0
                    )} ${circumference}`}
                    strokeDashoffset={
                      segment.offset
                    }
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() =>
                      setHoveredIndex(
                        segment.index
                      )
                    }
                    onMouseLeave={() =>
                      setHoveredIndex(null)
                    }
                  />
                );
              }
            )}

            <circle
              cx="120"
              cy="120"
              r="60"
              fill="white"
            />

            <text
              x="120"
              y="112"
              textAnchor="middle"
              fontSize="12"
              fill="#6B7280"
            >
              Total
            </text>

            <text
              x="120"
              y="137"
              textAnchor="middle"
              fontSize="23"
              fontWeight="700"
              fill="#111827"
            >
              {total}
            </text>
          </svg>

          {hoveredIndex !== null && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-lg">
              {segments[
                hoveredIndex
              ]?.label}{" "}
              —{" "}
              {segments[
                hoveredIndex
              ]?.value}{" "}
              (
              {(
                (segments[
                  hoveredIndex
                ]?.percentage ?? 0) *
                100
              ).toFixed(1)}
              %)
            </div>
          )}
        </div>

        <div className="mt-5 grid w-full grid-cols-2 gap-3">
          {segments.map(
            (segment) => (
              <div
                key={segment.label}
                className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-all ${
                  hoveredIndex ===
                  segment.index
                    ? "bg-gray-50 dark:bg-gray-800"
                    : ""
                }`}
                onMouseEnter={() =>
                  setHoveredIndex(
                    segment.index
                  )
                }
                onMouseLeave={() =>
                  setHoveredIndex(null)
                }
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      background:
                        PIE_COLORS[
                          segment.index %
                            PIE_COLORS.length
                        ],
                    }}
                  />

                  <span className="truncate text-xs text-gray-600 dark:text-gray-300">
                    {segment.label}
                  </span>
                </div>

                <span className="text-xs font-semibold text-gray-800 dark:text-white/90">
                  {segment.value}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </InsightCard>
  );
}

function SubDepartmentMonthlyChart({
  records,
  selectedSubDep,
  subDepOptions,
  analysisMode,
}: {
  records: AccidentRecord[];
  selectedSubDep: string;
  subDepOptions: string[];
  analysisMode: "monthly" | "yearly";
}) {
  const [
    hoveredIndex,
    setHoveredIndex,
  ] = useState<number | null>(null);

  const [
    tooltipPosition,
    setTooltipPosition,
  ] = useState({
    x: 0,
    y: 0,
  });

  const [
    selectedInsightPeriod,
    setSelectedInsightPeriod,
  ] = useState<number | null>(null);

  const availableYears = useMemo(() => {
    const dataYears = Array.from(
      new Set(
        records
          .map((record) =>
            getRecordDate(record).slice(0, 4)
          )
          .filter((year) => /^\d{4}$/.test(year))
          .map(Number)
      )
    );

    // Mode tahunan selalu menampilkan 2026-2030 terlebih dahulu.
    // Jika nanti ada data tahun setelah 2030, tahun tersebut otomatis ikut muncul.
    const firstYear = 2026;
    const lastYear = Math.max(
      2030,
      ...dataYears,
    );

    return Array.from(
      { length: lastYear - firstYear + 1 },
      (_, index) => firstYear + index
    );
  }, [records]);

  const periodLabels = useMemo(() => {
    if (analysisMode === "yearly") {
      return availableYears.map(String);
    }

    return MONTHS.map((month) =>
      month.slice(0, 3)
    );
  }, [analysisMode, availableYears]);

  const periodFullLabels = useMemo(() => {
    if (analysisMode === "yearly") {
      return availableYears.map(String);
    }

    return MONTHS;
  }, [analysisMode, availableYears]);

  const periodCounts = useMemo(() => {
    if (analysisMode === "yearly") {
      // Mode tahunan menampilkan total seluruh kecelakaan dalam satu tahun.
      // Jadi 2026 = akumulasi Januari sampai Desember 2026, dan akan
      // otomatis bertambah ketika record kecelakaan baru masuk.
      // Filter SubDepartemen tetap digunakan pada mode bulanan.
      return availableYears.map((year) =>
        records.filter((record) => {
          const date = getRecordDate(record);

          if (!date) {
            return false;
          }

          return Number(date.slice(0, 4)) === year;
        }).length
      );
    }

    return MONTHS.map((_, monthIndex) => {
      return records.filter((record) => {
        const date = getRecordDate(record);

        if (!date) {
          return false;
        }

        if (
          getRecordMonth(record) !== monthIndex
        ) {
          return false;
        }

        if (
          selectedSubDep !== "all" &&
          String(
            record.worker?.subDep || ""
          ).trim() !== selectedSubDep
        ) {
          return false;
        }

        return true;
      }).length;
    });
  }, [
    records,
    selectedSubDep,
    analysisMode,
    availableYears,
  ]);

  const topSubDepartments = useMemo(() => {
    if (selectedInsightPeriod === null) {
      return [];
    }

    const selectedPeriodValue =
      analysisMode === "yearly"
        ? availableYears[selectedInsightPeriod]
        : selectedInsightPeriod;

    const counts = new Map<string, number>();

    subDepOptions.forEach((subDep) => {
      counts.set(subDep, 0);
    });

    records.forEach((record) => {
      const date = getRecordDate(record);

      if (!date) {
        return;
      }

      if (analysisMode === "yearly") {
        if (
          Number(date.slice(0, 4)) !==
          selectedPeriodValue
        ) {
          return;
        }
      } else if (
        getRecordMonth(record) !==
        selectedPeriodValue
      ) {
        return;
      }

      const subDep = String(
        record.worker?.subDep || ""
      ).trim();

      if (!subDep) {
        return;
      }

      counts.set(
        subDep,
        (counts.get(subDep) ?? 0) + 1
      );
    });

    return Array.from(counts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }

        return a[0].localeCompare(b[0]);
      })
      .slice(0, 10);
  }, [
    records,
    selectedInsightPeriod,
    analysisMode,
    availableYears,
    subDepOptions,
  ]);

  const selectedSubDepPeriodCount = useMemo(() => {
    if (
      selectedInsightPeriod === null ||
      selectedSubDep === "all"
    ) {
      return 0;
    }

    if (analysisMode === "yearly") {
      const year =
        availableYears[selectedInsightPeriod];

      return records.filter((record) => {
        const date = getRecordDate(record);

        return (
          Number(date.slice(0, 4)) === year &&
          String(record.worker?.subDep || "").trim() ===
            selectedSubDep
        );
      }).length;
    }

    return records.filter((record) => {
      if (
        getRecordMonth(record) !==
        selectedInsightPeriod
      ) {
        return false;
      }

      return (
        String(record.worker?.subDep || "").trim() ===
        selectedSubDep
      );
    }).length;
  }, [
    records,
    selectedInsightPeriod,
    selectedSubDep,
    analysisMode,
    availableYears,
  ]);

  const selectedSubDepMonthlyRecap = useMemo(() => {
    if (selectedSubDep === "all") {
      return [];
    }

    return MONTHS.map((monthName, monthIndex) => {
      const count = records.filter((record) => {
        if (getRecordMonth(record) !== monthIndex) {
          return false;
        }

        return (
          String(record.worker?.subDep || "").trim() ===
          selectedSubDep
        );
      }).length;

      return {
        month: monthIndex,
        label: monthName,
        count,
      };
    });
  }, [records, selectedSubDep]);

  const selectedSubDepYearTotal = useMemo(() => {
    if (
      selectedSubDep === "all" ||
      selectedInsightPeriod === null ||
      analysisMode !== "yearly"
    ) {
      return 0;
    }

    const year =
      availableYears[selectedInsightPeriod];

    return records.filter((record) => {
      const date = getRecordDate(record);

      return (
        Number(date.slice(0, 4)) === year &&
        String(record.worker?.subDep || "").trim() ===
          selectedSubDep
      );
    }).length;
  }, [
    records,
    selectedSubDep,
    selectedInsightPeriod,
    analysisMode,
    availableYears,
  ]);

  const selectedYearHasData = useMemo(() => {
    if (
      selectedInsightPeriod === null ||
      analysisMode !== "yearly"
    ) {
      return false;
    }

    const year =
      availableYears[selectedInsightPeriod];

    return records.some((record) => {
      const date = getRecordDate(record);

      return Number(date.slice(0, 4)) === year;
    });
  }, [
    records,
    selectedInsightPeriod,
    analysisMode,
    availableYears,
  ]);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const selectedMonthlyPeriodHasData = useMemo(() => {
    if (
      selectedInsightPeriod === null ||
      analysisMode !== "monthly"
    ) {
      return false;
    }

    return records.some((record) => {
      const date = getRecordDate(record);

      return (
        date &&
        getRecordMonth(record) === selectedInsightPeriod
      );
    });
  }, [
    records,
    selectedInsightPeriod,
    analysisMode,
  ]);

  const selectedMonthlyPeriodIsFuture =
    analysisMode === "monthly" &&
    selectedInsightPeriod !== null &&
    selectedInsightPeriod > currentMonth;

  useEffect(() => {
    setSelectedInsightPeriod(null);
  }, [analysisMode, selectedSubDep]);

  /*
   * Animasi perubahan data.
   * Saat SubDepartemen diganti, nilai lama bergerak
   * secara halus menuju nilai baru seperti Campaign Performance.
   */
  const [
    animatedCounts,
    setAnimatedCounts,
  ] = useState<number[]>(periodCounts);

  const previousCountsRef =
    useRef<number[]>(periodCounts);

  const hasRenderedModeRef =
    useRef<Record<string, boolean>>({});

  const [lineRevealProgress, setLineRevealProgress] =
    useState(1);

  const lastModeRef = useRef(analysisMode);

  useEffect(() => {
    const modeChanged =
      lastModeRef.current !== analysisMode;

    const shouldDrawFromSide =
      !hasRenderedModeRef.current[analysisMode] ||
      modeChanged;

    lastModeRef.current = analysisMode;

    if (shouldDrawFromSide) {
      hasRenderedModeRef.current[analysisMode] = true;
      setLineRevealProgress(0);

      let revealFrame = 0;
      const revealStart = performance.now();
      const revealDuration = 3200;

      const reveal = (currentTime: number) => {
        const progress = Math.min(
          (currentTime - revealStart) / revealDuration,
          1
        );

        const eased =
          1 - Math.pow(1 - progress, 3);

        setLineRevealProgress(eased);

        if (progress < 1) {
          revealFrame = requestAnimationFrame(reveal);
        } else {
          setLineRevealProgress(1);
        }
      };

      revealFrame = requestAnimationFrame(reveal);

      return () => {
        cancelAnimationFrame(revealFrame);
      };
    }

    setLineRevealProgress(1);
  }, [analysisMode]);

  useEffect(() => {
    const from =
      previousCountsRef.current.length ===
      periodCounts.length
        ? previousCountsRef.current
        : periodCounts;

    const to = periodCounts;

    let animationFrame = 0;
    const startTime = performance.now();

    const duration = 3800;

    const easeInOutQuint = (value: number) => {
      return value < 0.5
        ? 16 * value * value * value * value * value
        : 1 - Math.pow(-2 * value + 2, 5) / 2;
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;

      const progress = Math.min(
        elapsed / duration,
        1
      );

      const eased = easeInOutQuint(progress);

      const nextValues = to.map((target, index) => {
        const start = Number(from[index] ?? 0);

        return start + (target - start) * eased;
      });

      setAnimatedCounts(nextValues);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        previousCountsRef.current = [...to];
        setAnimatedCounts([...to]);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [periodCounts]);

  const maxValue = Math.max(
    ...periodCounts,
    1
  );

  const animatedMaxValue = maxValue;
  const width = 1100;
  const height = 360;

  const paddingLeft = 52;
  const paddingRight = 28;
  const paddingTop = 24;
  const paddingBottom = 58;

  const chartWidth =
    width -
    paddingLeft -
    paddingRight;

  const chartHeight =
    height -
    paddingTop -
    paddingBottom;

  /*
   * Gunakan nilai animatedCounts untuk posisi garis.
   * Jadi path benar-benar bergerak dari posisi lama
   * menuju posisi baru.
   */
  const points = animatedCounts.map(
    (value, index) => {
      const x =
        paddingLeft +
        (index /
          Math.max(periodLabels.length - 1, 1)) *
          chartWidth;

      const y =
        paddingTop +
        chartHeight -
        (value / animatedMaxValue) *
          chartHeight;

      return {
        x,
        y,
        value,
      };
    }
  );

  const createSmoothPath = () => {
    if (!points.length) {
      return "";
    }

    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }

    let path =
      `M ${points[0].x} ${points[0].y}`;

    for (
      let index = 0;
      index < points.length - 1;
      index++
    ) {
      const current =
        points[index];

      const next =
        points[index + 1];

      const controlX =
        (current.x + next.x) / 2;

      path +=
        ` C ${controlX} ${current.y},` +
        ` ${controlX} ${next.y},` +
        ` ${next.x} ${next.y}`;
    }

    return path;
  };

  const linePath =
    createSmoothPath();

  const areaPath =
    points.length
      ? `${linePath} L ${
          points[points.length - 1].x
        } ${
          paddingTop +
          chartHeight
        } L ${points[0].x} ${
          paddingTop +
          chartHeight
        } Z`
      : "";

  const hoveredItem =
    hoveredIndex !== null
      ? {
          label:
            periodFullLabels[hoveredIndex] ??
            "",
          value:
            Math.round(
              animatedCounts[
                hoveredIndex
              ] ?? 0
            ),
        }
      : null;

  const tooltipWidth = 190;
  const tooltipHeight = 72;

  let tooltipX =
    tooltipPosition.x + 18;

  let tooltipY =
    tooltipPosition.y - 88;

  if (
    tooltipX + tooltipWidth >
    width - paddingRight
  ) {
    tooltipX =
      tooltipPosition.x -
      tooltipWidth -
      18;
  }

  if (
    tooltipX < paddingLeft
  ) {
    tooltipX = paddingLeft;
  }

  if (
    tooltipY < paddingTop
  ) {
    tooltipY =
      tooltipPosition.y + 18;
  }

  if (
    tooltipY + tooltipHeight >
    paddingTop + chartHeight
  ) {
    tooltipY =
      paddingTop +
      chartHeight -
      tooltipHeight;
  }

  return (
    <div className="w-full">
      <div className="relative w-full overflow-x-auto pb-3">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block min-w-[900px] overflow-visible"
          role="img"
          aria-label={`Grafik kecelakaan kerja per ${
            analysisMode === "yearly"
              ? "tahun"
              : "bulan"
          } berdasarkan SubDepartemen`}
        >
          <defs>
            <linearGradient
              id="subDepartmentAreaGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#16a34a"
                stopOpacity="0.16"
              />

              <stop
                offset="100%"
                stopColor="#16a34a"
                stopOpacity="0.01"
              />
            </linearGradient>

            <filter
              id="subDepartmentTooltipShadow"
              x="-30%"
              y="-30%"
              width="160%"
              height="180%"
            >
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="6"
                floodColor="#000000"
                floodOpacity="0.10"
              />
            </filter>
          </defs>

          {[0, 25, 50, 75, 100].map(
            (percent) => {
              const y =
                paddingTop +
                chartHeight -
                (percent / 100) *
                  chartHeight;

              const gridValue =
                Math.round(
                  (percent / 100) *
                    maxValue
                );

              return (
                <g
                  key={`subdep-grid-${percent}`}
                >
                  <line
                    x1={paddingLeft}
                    x2={
                      paddingLeft +
                      chartWidth
                    }
                    y1={y}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="4 5"
                  />

                  <text
                    x={
                      paddingLeft - 12
                    }
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="#9ca3af"
                  >
                    {gridValue}
                  </text>
                </g>
              );
            }
          )}

          <line
            x1={paddingLeft}
            x2={paddingLeft}
            y1={paddingTop}
            y2={
              paddingTop +
              chartHeight
            }
            stroke="#d1d5db"
            strokeWidth="1"
          />

          <line
            x1={paddingLeft}
            x2={
              paddingLeft +
              chartWidth
            }
            y1={
              paddingTop +
              chartHeight
            }
            y2={
              paddingTop +
              chartHeight
            }
            stroke="#d1d5db"
            strokeWidth="1"
          />

          {areaPath && (
            <path
              d={areaPath}
              fill="url(#subDepartmentAreaGradient)"
              pointerEvents="none"
            />
          )}

          <path
            d={linePath}
            fill="none"
            stroke="#16a34a"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - lineRevealProgress}
          />

          {hoveredIndex !== null && (
            <line
              x1={
                points[
                  hoveredIndex
                ].x
              }
              x2={
                points[
                  hoveredIndex
                ].x
              }
              y1={paddingTop}
              y2={
                paddingTop +
                chartHeight
              }
              stroke="#9ca3af"
              strokeWidth="1"
              strokeDasharray="5 5"
              pointerEvents="none"
            />
          )}

          {points.map(
            (point, index) => {
              const previousPoint =
                points[index - 1];

              const nextPoint =
                points[index + 1];

              const leftBoundary =
                previousPoint
                  ? (previousPoint.x +
                      point.x) /
                    2
                  : paddingLeft;

              const rightBoundary =
                nextPoint
                  ? (point.x +
                      nextPoint.x) /
                    2
                  : paddingLeft +
                    chartWidth;

              const isHovered =
                hoveredIndex === index;

              return (
                <g
                  key={`subdep-point-${analysisMode}-${index}`}
                  onMouseEnter={() =>
                    setHoveredIndex(
                      index
                    )
                  }
                  onMouseMove={(event) => {
                    const rect =
                      event.currentTarget
                        .ownerSVGElement
                        ?.getBoundingClientRect();

                    if (!rect) {
                      return;
                    }

                    const scaleX =
                      width /
                      rect.width;

                    const scaleY =
                      height /
                      rect.height;

                    const x =
                      (event.clientX -
                        rect.left) *
                      scaleX;

                    const y =
                      (event.clientY -
                        rect.top) *
                      scaleY;

                    setTooltipPosition({
                      x,
                      y,
                    });
                  }}
                  onMouseLeave={() =>
                    setHoveredIndex(null)
                  }
                  onClick={() => {
                    setSelectedInsightPeriod(
                      selectedInsightPeriod === index
                        ? null
                        : index
                    );
                  }}
                  className="cursor-pointer"
                >
                  <rect
                    x={leftBoundary}
                    y={paddingTop}
                    width={Math.max(
                      rightBoundary -
                        leftBoundary,
                      1
                    )}
                    height={
                      chartHeight
                    }
                    fill="transparent"
                  />

                  <text
                    x={point.x}
                    y={
                      paddingTop +
                      chartHeight +
                      28
                    }
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={
                      isHovered
                        ? "600"
                        : "400"
                    }
                    fill={
                      isHovered
                        ? "#16a34a"
                        : "#6b7280"
                    }
                  >
                    {periodLabels[index]}
                  </text>
                </g>
              );
            }
          )}

          {hoveredItem && (
            <g
              pointerEvents="none"
              style={{
                transform: `translate(${tooltipX}px, ${tooltipY}px)`,
              }}
            >
              <rect
                x="0"
                y="0"
                width={tooltipWidth}
                height={tooltipHeight}
                rx="10"
                fill="#ffffff"
                stroke="#eef0f2"
                strokeWidth="1"
                filter="url(#subDepartmentTooltipShadow)"
              />

              <text
                x="16"
                y="24"
                fontSize="12"
                fontWeight="600"
                fill="#111827"
              >
                {hoveredItem.label}
              </text>

              <circle
                cx="20"
                cy="48"
                r="4"
                fill="#16a34a"
              />

              <text
                x="32"
                y="52"
                fontSize="12"
                fill="#6b7280"
              >
                Kecelakaan
              </text>

              <text
                x="145"
                y="52"
                fontSize="13"
                fontWeight="700"
                fill="#111827"
              >
                {hoveredItem.value}
              </text>
            </g>
          )}
        </svg>
      </div>

      {selectedInsightPeriod !== null && (
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/50 px-5 py-5 dark:border-gray-800 dark:bg-gray-900/20">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {selectedSubDep === "all"
                  ? `Top 10 SubDepartemen dengan Kecelakaan — ${
                      periodFullLabels[selectedInsightPeriod]
                    }`
                  : `Kecelakaan ${selectedSubDep} — ${
                      periodFullLabels[selectedInsightPeriod]
                    }`}
              </h3>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedSubDep === "all"
                  ? `Menampilkan 10 SubDepartemen dengan jumlah kecelakaan tertinggi pada ${
                      analysisMode === "yearly"
                        ? "tahun"
                        : "bulan"
                    } yang dipilih.`
                  : `Menampilkan jumlah kecelakaan ${selectedSubDep} pada ${
                      analysisMode === "yearly"
                        ? "tahun"
                        : "bulan"
                    } yang dipilih.`}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedInsightPeriod(null)
              }
              className="ggf-close-filter shrink-0 self-start"
            >
              Tutup
            </button>
          </div>

          {selectedSubDep !== "all" ? (
            analysisMode === "yearly" ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900/30">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Total Rekap Kecelakaan
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
                        {selectedSubDepYearTotal}
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                      {selectedSubDep}
                      <br />
                      {periodFullLabels[selectedInsightPeriod]}
                    </div>
                  </div>
                </div>

                {selectedSubDepYearTotal === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-200 px-4 py-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Tidak ada kecelakaan pada tahun{" "}
                    {periodFullLabels[selectedInsightPeriod]}{" "}
                    untuk {selectedSubDep}.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900/30">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Total Rekap Kecelakaan
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
                        {selectedSubDepMonthlyRecap.reduce(
                          (sum, item) => sum + item.count,
                          0
                        )}
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                      {selectedSubDep}
                      <br />
                      seluruh bulan
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedSubDepMonthlyRecap.map((item) => {
                    const maxCount = Math.max(
                      ...selectedSubDepMonthlyRecap.map(
                        (entry) => entry.count
                      ),
                      1
                    );

                    const widthPercentage =
                      (item.count / maxCount) * 100;

                    const isSelected =
                      item.month === selectedInsightPeriod;

                    return (
                      <div
                        key={item.month}
                        className="grid grid-cols-[28px_minmax(150px,1fr)_minmax(120px,2fr)_44px] items-center gap-3"
                      >
                        <span
                          className={`text-xs font-semibold ${
                            isSelected
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {item.month + 1}
                        </span>

                        <span
                          className={`truncate text-xs font-medium ${
                            isSelected
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                          title={item.label}
                        >
                          {item.label}
                        </span>

                        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700/40">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${widthPercentage}%`,
                              background:
                                item.count > 0
                                  ? "#B8D8A8"
                                  : "transparent",
                              boxShadow:
                                isSelected && item.count > 0
                                  ? "0 2px 7px rgba(120, 170, 100, 0.35)"
                                  : "none",
                              transform: isSelected
                                ? "scaleY(1.18)"
                                : "scaleY(1)",
                              transformOrigin: "center",
                            }}
                          />
                        </div>

                        <span
                          className={`text-right text-xs font-semibold ${
                            isSelected
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-gray-800 dark:text-white/90"
                          }`}
                        >
                          {item.count}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {selectedSubDepPeriodCount === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-200 px-4 py-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Tidak ada kecelakaan pada{" "}
                    {periodFullLabels[selectedInsightPeriod]}{" "}
                    untuk {selectedSubDep}.
                  </div>
                )}
              </div>
            )
          ) : (
            (analysisMode === "yearly" &&
              (
                (availableYears[selectedInsightPeriod] ??
                  currentYear) > currentYear ||
                !selectedYearHasData
              )) ||
            (analysisMode === "monthly" &&
              (
                selectedMonthlyPeriodIsFuture ||
                !selectedMonthlyPeriodHasData
              ))
          ) ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Data belum tersedia
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {analysisMode === "yearly"
                  ? availableYears[selectedInsightPeriod] > currentYear
                    ? `Tahun ${availableYears[selectedInsightPeriod]} belum berjalan.`
                    : `Belum ada data kecelakaan untuk tahun ${availableYears[selectedInsightPeriod]}.`
                  : selectedMonthlyPeriodIsFuture
                    ? `Bulan ${periodFullLabels[selectedInsightPeriod]} belum berjalan.`
                    : `Belum ada data kecelakaan untuk bulan ${periodFullLabels[selectedInsightPeriod]}.`}
              </p>
            </div>
          ) : topSubDepartments.length > 0 ? (
            <div className="space-y-3">
              {topSubDepartments.map(
                ([subDep, count], index) => {
                  const maxCount = Math.max(
                    topSubDepartments[0]?.[1] ?? 0,
                    1
                  );

                  const widthPercentage =
                    count > 0 ? (count / maxCount) * 100 : 0;

                  return (
                    <div
                      key={subDep}
                      className="grid grid-cols-[28px_minmax(150px,1fr)_minmax(120px,2fr)_44px] items-center gap-3"
                    >
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {index + 1}
                      </span>

                      <span
                        className="truncate text-xs font-medium text-gray-700 dark:text-gray-300"
                        title={subDep}
                      >
                        {subDep}
                      </span>

                      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700/40">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${widthPercentage}%`,
                            background:
                              count > 0
                                ? "#B8D8A8"
                                : "transparent",
                          }}
                        />
                      </div>

                      <span className="text-right text-xs font-semibold text-gray-800 dark:text-white/90">
                        {count}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Tidak ada data kecelakaan pada{" "}
              {analysisMode === "yearly"
                ? "tahun"
                : "bulan"}{" "}
              ini.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function shortLabel(
  value: string
) {
  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 15)}…`;
}

function exportAnnualReport(
  records: AccidentRecord[],
  year: number
) {
  const annualRecords = records
    .filter((record) => {
      const date = getRecordDate(record);
      return Number(date.slice(0, 4)) === year;
    })
    .sort((a, b) => {
      const dateCompare = getRecordDate(a).localeCompare(
        getRecordDate(b)
      );

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return getRecordTimeValue(a) - getRecordTimeValue(b);
    });

  const escapeXml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  // Urutan kolom mengikuti template Form Data Kecelakaan Kerja.
  const fields = [
    "Tanggal",
    "Waktu",
    "KIT",
    "Nama Lengkap",
    "Jenis Kelamin",
    "Umur",
    "SubDep",
    "Div/SubDiv",
    "Status Pekerja",
    "Wilayah / Lokasi",
    "Grouping",
    "Kronologi Kejadian",
    "Akibat",
    "Status Rujuk",
    "Type Of Accident",
  ];

  // Lebar dibuat mengikuti proporsi template Form Data.
  const columnWidths = [
    105,
    80,
    95,
    180,
    105,
    55,
    155,
    150,
    95,
    150,
    120,
    260,
    120,
    90,
    125,
  ];

  const exportMonths = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const formatExportDate = (value: string) => {
    if (!value) {
      return "";
    }

    const parts = value.split("-");
    if (parts.length !== 3) {
      return formatDate(value);
    }

    const yearPart = parts[0];
    const monthPart = Number(parts[1]);
    const dayPart = parts[2];

    if (
      !Number.isInteger(monthPart) ||
      monthPart < 1 ||
      monthPart > 12
    ) {
      return formatDate(value);
    }

    return `${dayPart} ${exportMonths[monthPart - 1]} ${yearPart}`;
  };

  const getRecordRows = (monthRecords: AccidentRecord[]) =>
    monthRecords.map((record) => [
      formatExportDate(getRecordDate(record)),
      record.waktu || "",
      record.worker?.kit || "",
      record.worker?.namaLengkap || "",
      record.worker?.jenisKelamin || "",
      record.worker?.umur || "",
      record.worker?.subDep || "",
      record.worker?.divSubDiv || "",
      record.worker?.statusPekerja || "",
      record.lokasi || "",
      record.grouping || "",
      record.kronologi || "",
      record.akibat || "",
      record.statusRujuk || "",
      record.typeAccident || "",
    ]);

  const makeCell = (value: unknown, styleId = "Data") =>
    `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(
      value
    )}</Data></Cell>`;

  const makeNumberCell = (value: number, styleId = "Number") =>
    `<Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${value}</Data></Cell>`;

  const makeRow = (values: unknown[], styleId = "Data") =>
    `<Row ss:AutoFitHeight="0" ss:Height="20">${values
      .map((value) => makeCell(value, styleId))
      .join("")}</Row>`;

  const makeWorksheet = (
    name: string,
    rows: string,
    options?: {
      summary?: boolean;
    }
  ) => {
    const isSummary = options?.summary === true;
    const widths = isSummary ? [120, 125] : columnWidths;

    return `
    <Worksheet ss:Name="${escapeXml(name)}">
      <Table ss:ExpandedColumnCount="${widths.length}" ss:ExpandedRowCount="0" x:FullColumns="1" x:FullRows="1">
        ${widths
          .map((width) => `<Column ss:Width="${width}" />`)
          .join("")}
        ${rows}
      </Table>
    </Worksheet>`;
  };

  const summaryRows = MONTHS.map((month, monthIndex) => {
    const count = annualRecords.filter(
      (record) => getRecordMonth(record) === monthIndex
    ).length;

    return `<Row ss:AutoFitHeight="0" ss:Height="20">
      ${makeCell(month, "Data")}
      ${makeNumberCell(count)}
    </Row>`;
  }).join("");

  const summaryWorksheet = makeWorksheet(
    "Ringkasan",
    `<Row ss:AutoFitHeight="0" ss:Height="20">
      <Cell ss:MergeAcross="1" ss:StyleID="SummaryTitle">
        <Data ss:Type="String">Rekap kecelakaan kerja</Data>
      </Cell>
    </Row>
    <Row ss:AutoFitHeight="0" ss:Height="20">
      ${makeCell("Bulan", "Header")}
      ${makeCell("Jumlah Kecelakaan", "Header")}
    </Row>
    ${summaryRows}
    <Row ss:AutoFitHeight="0" ss:Height="20">
      ${makeCell("TOTAL KECELAKAAN", "Total")}
      ${makeNumberCell(annualRecords.length, "TotalNumber")}
    </Row>`,
    { summary: true }
  );

  const monthlyWorksheets = MONTHS.map((month, monthIndex) => {
    const monthRecords = annualRecords.filter(
      (record) => getRecordMonth(record) === monthIndex
    );

    // Template Form Data dimulai langsung dari header pada baris pertama.
    const headerRow = `<Row ss:AutoFitHeight="0" ss:Height="22">
      ${fields.map((field) => makeCell(field, "Header")).join("")}
    </Row>`;

    if (!monthRecords.length) {
      return makeWorksheet(
        month,
        `${headerRow}
        <Row ss:AutoFitHeight="0" ss:Height="20">
          <Cell ss:MergeAcross="14" ss:StyleID="EmptyMessage">
            <Data ss:Type="String">Data kecelakaan belum tersedia.</Data>
          </Cell>
        </Row>`
      );
    }

    const dataRows = getRecordRows(monthRecords)
      .map((row) => makeRow(row))
      .join("");

    return makeWorksheet(month, `${headerRow}${dataRows}`);
  }).join("");

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="11" />
    </Style>

    <Style ss:ID="Header">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" />
      <Interior ss:Color="#00B0F0" ss:Pattern="Solid" />
    </Style>

    <Style ss:ID="Data">
      <Alignment ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="11" />
    </Style>

    <Style ss:ID="Number">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="11" />
    </Style>

    <Style ss:ID="SummaryTitle">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" />
      <Interior ss:Color="#00B0F0" ss:Pattern="Solid" />
    </Style>

    <Style ss:ID="Total">
      <Alignment ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" />
    </Style>

    <Style ss:ID="TotalNumber">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" />
    </Style>

    <Style ss:ID="EmptyMessage">
      <Alignment ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="11" />
    </Style>
  </Styles>
  ${summaryWorksheet}
  ${monthlyWorksheets}
</Workbook>`;

  const blob = new Blob([xml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `Rekap-Kecelakaan-${year}.xls`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}


function exportSelectedMonth(
  records: AccidentRecord[],
  month: number,
  year: number
) {
  if (!records.length) {
    return;
  }

  const escapeXml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  // Format dan urutan kolom dibuat sama persis dengan template Form Data.
  const fields = [
    "Tanggal",
    "Waktu",
    "KIT",
    "Nama Lengkap",
    "Jenis Kelamin",
    "Umur",
    "SubDep",
    "Div/SubDiv",
    "Status Pekerja",
    "Wilayah / Lokasi",
    "Grouping",
    "Kronologi Kejadian",
    "Akibat",
    "Status Rujuk",
    "Type Of Accident",
  ];

  const columnWidths = [
    125,
    90,
    115,
    240,
    130,
    70,
    200,
    160,
    110,
    150,
    120,
    260,
    120,
    90,
    125,
  ];

  const exportMonths = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const formatExportDate = (value: string) => {
    if (!value) {
      return "";
    }

    const parts = value.split("-");
    if (parts.length !== 3) {
      return value;
    }

    const yearPart = parts[0];
    const monthPart = Number(parts[1]);
    const dayPart = parts[2];

    if (
      !Number.isInteger(monthPart) ||
      monthPart < 1 ||
      monthPart > 12
    ) {
      return value;
    }

    return `${dayPart} ${exportMonths[monthPart - 1]} ${yearPart}`;
  };

  const rows = records
    .map((record) => [
      formatExportDate(getRecordDate(record)),
      record.waktu || "",
      record.worker?.kit || "",
      record.worker?.namaLengkap || "",
      record.worker?.jenisKelamin || "",
      record.worker?.umur || "",
      record.worker?.subDep || "",
      record.worker?.divSubDiv || "",
      record.worker?.statusPekerja || "",
      record.lokasi || "",
      record.grouping || "",
      record.kronologi || "",
      record.akibat || "",
      record.statusRujuk || "",
      record.typeAccident || "",
    ])
    .sort((a, b) =>
      String(a[0]).localeCompare(String(b[0]))
    );

  const makeCell = (value: unknown, styleId = "Data") =>
    `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(
      value
    )}</Data></Cell>`;

  const headerRow = `<Row ss:AutoFitHeight="0" ss:Height="22">
    ${fields.map((field) => makeCell(field, "Header")).join("")}
  </Row>`;

  const dataRows = rows
    .map(
      (row) =>
        `<Row ss:AutoFitHeight="0" ss:Height="20">
          ${row.map((value) => makeCell(value, "Data")).join("")}
        </Row>`
    )
    .join("");

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="11" />
    </Style>

    <Style ss:ID="Header">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" />
      <Interior ss:Color="#00B0F0" ss:Pattern="Solid" />
    </Style>

    <Style ss:ID="Data">
      <Alignment ss:Vertical="Center" />
      <Font ss:FontName="Calibri" ss:Size="11" />
    </Style>
  </Styles>

  <Worksheet ss:Name="${escapeXml(
    `Data-Kecelakaan-${MONTHS[month]}-${year}`
  )}">
    <Table ss:ExpandedColumnCount="${fields.length}" ss:ExpandedRowCount="${
      rows.length + 1
    }" x:FullColumns="1" x:FullRows="1">
      ${columnWidths
        .map((width) => `<Column ss:Width="${width}" />`)
        .join("")}
      ${headerRow}
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `Data-Kecelakaan-${MONTHS[month]}-${year}.xls`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

