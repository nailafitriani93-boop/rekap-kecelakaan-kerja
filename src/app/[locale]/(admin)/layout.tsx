"use client";

import AppHeader from "@/layout/AppHeader";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  CURRENT_USER_STORAGE_KEY,
  USER_STORAGE_KEY,
  DEFAULT_USERS,
  type ManagedUser,
} from "@/data/userData";

const ROUTE_ACCESS: Record<string, string> = {
  "/": "dashboard",
  "/form-input-kecelakaan": "form-input-kecelakaan",
  "/rekap-kecelakaan": "rekap-kecelakaan",
  "/master-data": "master-data",
  "/manajemen-user": "manajemen-user",
  "/profile": "profile",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [authorizedPath, setAuthorizedPath] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      setAuthorizedPath(null);
      setAccessDenied(false);

      try {
        const isDashboard = pathname === "/" || pathname === "/en";
        const currentRaw = localStorage.getItem(
          CURRENT_USER_STORAGE_KEY
        );

        if (!currentRaw) {
          if (isDashboard) {
            setAuthorizedPath(pathname);
          } else {
            router.replace("/signin");
          }
          return;
        }

        const currentUser = JSON.parse(currentRaw) as ManagedUser;
        const sessionResponse = await fetch("/api/auth/session", {
          cache: "no-store",
        });

        if (cancelled) return;

        if (!sessionResponse.ok) {
          if (isDashboard) {
            setAuthorizedPath(pathname);
          } else {
            router.replace("/signin");
          }
          return;
        }

        const sessionResult = (await sessionResponse.json()) as {
          authenticated?: boolean;
          user?: { username?: string };
        };
        const sessionUsername = String(sessionResult.user?.username ?? "")
          .trim()
          .toLowerCase();
        const currentUsername = String(currentUser.username ?? "")
          .trim()
          .toLowerCase();

        if (
          !sessionResult.authenticated ||
          !sessionUsername ||
          sessionUsername !== currentUsername
        ) {
          if (isDashboard) {
            setAuthorizedPath(pathname);
          } else {
            router.replace("/signin");
          }
          return;
        }

        const usersRaw = localStorage.getItem(USER_STORAGE_KEY);
        const users: ManagedUser[] = usersRaw
          ? (JSON.parse(usersRaw) as ManagedUser[])
          : DEFAULT_USERS;

        if (!Array.isArray(users)) {
          setAccessDenied(true);
          return;
        }

        const user = users.find(
          (item) =>
            String(item.id) === String(currentUser.id) ||
            (
              Boolean(currentUser.username) &&
              String(item.username) === String(currentUser.username)
            )
        );

        if (!user || user.status !== "Aktif") {
          setAccessDenied(true);
          return;
        }

        const requiredAccess = ROUTE_ACCESS[pathname];

        if (!requiredAccess) {
          setAuthorizedPath(pathname);
          return;
        }

        const allowedPages = Array.isArray(user.accessPages)
          ? user.accessPages
          : [];

        if (!allowedPages.includes(requiredAccess)) {
          setAccessDenied(true);
          return;
        }

        setAuthorizedPath(pathname);
      } catch (error) {
        console.error("Gagal memeriksa hak akses:", error);

        if (!cancelled) {
          if (pathname === "/" || pathname === "/en") {
            setAuthorizedPath(pathname);
          } else {
            router.replace("/signin");
          }
        }
      }
    };

    checkAccess();

    const handleUserUpdated = () => checkAccess();

    window.addEventListener("ggf-user-updated", handleUserUpdated);
    window.addEventListener("storage", handleUserUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("ggf-user-updated", handleUserUpdated);
      window.removeEventListener("storage", handleUserUpdated);
    };
  }, [pathname, router]);

  const canRenderPage = authorizedPath === pathname;

  return (
    <div className="min-h-screen w-full">
      <div className="w-full min-w-0">
        <AppHeader />

        {accessDenied ? (
          <main
            className="flex min-h-[calc(100vh-76px)] w-full items-center justify-center p-4"
            role="alert"
          >
            <div className="max-w-lg text-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Anda tidak memiliki akses ke laman ini
              </h1>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Silakan hubungi administrator jika Anda membutuhkan akses
                ke laman tersebut.
              </p>
            </div>
          </main>
        ) : canRenderPage ? (
          <main className="w-full min-w-0 p-4 md:p-6">
            {children}
          </main>
        ) : (
          <main
            className="flex min-h-[calc(100vh-76px)] w-full items-center justify-center"
            aria-label="Memeriksa akses halaman"
          >
            <span className="text-sm text-gray-500">
              Memeriksa akses...
            </span>
          </main>
        )}
      </div>
    </div>
  );
}