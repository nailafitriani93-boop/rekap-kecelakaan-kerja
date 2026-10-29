
"use client";

import UserDropdown from "@/components/header/UserDropdown";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/utils";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  CURRENT_USER_STORAGE_KEY,
  type ManagedUser,
} from "@/data/userData";

const DEFAULT_ACCESS_PAGES = [
  "dashboard",
  "form-input-kecelakaan",
  "rekap-kecelakaan",
  "master-data",
  "manajemen-user",
  "profile",
];

const AppHeader: React.FC = () => {
  const pathname = usePathname();

  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
        });
        const sessionResult = response.ok ? await response.json() : null;
        const raw = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY);

        if (cancelled) return;

        if (!sessionResult?.authenticated || !raw) {
          setIsLoggedIn(false);
          setAllowedPages(["dashboard"]);
          setIsInitialized(true);
          return;
        }

        const user = JSON.parse(raw) as ManagedUser;
        setIsLoggedIn(true);
        setAllowedPages(
          user.accessPages !== undefined
            ? user.accessPages
            : DEFAULT_ACCESS_PAGES
        );
        setIsInitialized(true);
      } catch {
        if (!cancelled) {
          setIsLoggedIn(false);
          setAllowedPages(["dashboard"]);
          setIsInitialized(true);
        }
      }
    };

    void refresh();
    window.addEventListener("ggf-user-updated", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("ggf-user-updated", refresh);
    };
  }, []);

  const allItems = [
    {
      href: "/" as const,
      label: "Dashboard",
      access: "dashboard",
    },
    {
      href: "/form-input-kecelakaan" as const,
      label: "Form Input Kecelakaan",
      access: "form-input-kecelakaan",
    },
    {
      href: "/rekap-kecelakaan" as const,
      label: "Data Rekap Kecelakaan",
      access: "rekap-kecelakaan",
    },
    {
      href: "/master-data" as const,
      label: "Master Data",
      access: "master-data",
    },
  ];

  // Seluruh menu tetap terlihat; hak akses diperiksa saat halaman dibuka.
  const items = isInitialized ? allItems : [];

  const canManageUsers =
    isInitialized &&
    isLoggedIn &&
    allowedPages.includes("manajemen-user");

  return (
    <header className="sticky top-0 z-99999 w-full border-b border-[#e0e8e2] bg-white">
      <div className="mx-auto flex min-h-[76px] w-full items-center gap-4 px-4 py-2 sm:px-6 xl:px-9">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-4"
          aria-label="Great Giant Foods"
        >
          <Image
            width={112}
            height={62}
            className="h-12 w-auto object-contain"
            src="/images/logo/ggf-logo.png"
            alt="Great Giant Foods"
            priority
          />

          <span className="hidden min-w-0 sm:block">
            <span className="block whitespace-nowrap text-[15px] font-bold leading-5 text-[#183b2b]">
              Dashboard Kecelakaan Kerja
            </span>

            <span className="block whitespace-nowrap text-[11px] font-medium leading-4 text-[#7d8981]">
              Sistem Informasi Great Giant Foods
            </span>
          </span>
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="min-w-0 flex-1 overflow-x-auto no-scrollbar"
        >
          {!isInitialized ? (
            <div
              className="h-[52px] w-full"
              aria-hidden="true"
            />
          ) : (
            <div className="flex min-w-max items-stretch justify-center gap-1">
              {items.map(({ href, label }) => {
                const active = pathname === href;

                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex min-h-[52px] items-center justify-center whitespace-nowrap rounded-t-xl border-b-2 px-4 text-[12px] font-semibold transition-colors duration-150",
                      active
                        ? "border-[#07813e] bg-[#eef8f1] text-[#07813e]"
                        : "border-transparent text-[#657169] hover:bg-[#f5f8f5] hover:text-[#07813e]"
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        <div className="ml-auto flex min-h-8 shrink-0 items-center justify-end gap-2">
          {!isInitialized ? (
            <div
              className="h-8 w-[68px] shrink-0"
              aria-hidden="true"
            />
          ) : (
            <>
              {isLoggedIn ? (
                <UserDropdown />
              ) : (
                <Link
                  href="/signin"
                  className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md bg-[#07813e] px-4 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-[#066c35]"
                >
                  Login
                </Link>
              )}

              {canManageUsers && (
                <Link
                  href="/manajemen-user"
                  className={cn(
                    "inline-flex h-8 items-center whitespace-nowrap rounded-md bg-[#07813e] px-3 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-[#066c35]",
                    pathname === "/manajemen-user" && "bg-[#066c35]"
                  )}
                >
                  Kelola User
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
