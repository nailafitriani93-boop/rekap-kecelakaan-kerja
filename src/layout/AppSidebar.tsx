"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/utils";
import {
  PieChartIcon,
  UploadIcon,
  ListIcon,
  UserCircleIcon,
} from "../icons/index";
import { useSidebar } from "../context/SidebarContext";
import { useTranslations } from "next-intl";

const AppSidebar: React.FC = () => {
  const t = useTranslations("header");

  const {
    isExpanded,
    isMobileOpen,
    isHovered,
    setIsHovered,
    toggleSidebar,
    toggleMobileSidebar,
  } = useSidebar();

  const pathname = usePathname();
  const expanded = isExpanded || isHovered || isMobileOpen;

  const items = [
    {
      href: "/",
      label: "Dashboard",
      icon: PieChartIcon,
    },
    {
      href: "/rekap-kecelakaan",
      label: "Rekap Kecelakaan",
      icon: ListIcon,
    },
    {
      href: "/master-data",
      label: "Master Data",
      icon: UploadIcon,
    },
    {
      href: "/manajemen-user",
      label: "Manajemen User",
      icon: UserCircleIcon,
    },
  ];

  const handleToggle = () => {
    if (window.innerWidth >= 1280) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 ${
        expanded ? "w-72.5" : "w-22.5"
      } ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      } xl:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Toggle Sidebar - menggantikan posisi logo */}
      <div
        className={`flex py-8 ${
          expanded ? "justify-start" : "xl:justify-center"
        }`}
      >
        <button
          className={`z-99999 flex h-10 w-10 items-center justify-center rounded-lg border-gray-200 text-gray-500 lg:h-11 lg:w-11 lg:bg-transparent xl:border dark:border-gray-800 dark:text-gray-400 dark:lg:bg-transparent ${
            isMobileOpen ? "bg-gray-100 dark:bg-white/3" : ""
          }`}
          onClick={handleToggle}
          aria-label={t("toggleSidebar")}
          suppressHydrationWarning
        >
          {isMobileOpen ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.0115 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg
              className="rtl:-scale-x-100"
              width="16"
              height="12"
              viewBox="0 0 16 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>
      </div>

      <nav>
        {expanded && (
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Menu
          </p>
        )}

        <div className="space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group menu-item",
                  active
                    ? "menu-item-active"
                    : "menu-item-inactive",
                  !expanded && "lg:justify-center"
                )}
              >
                <span
                  className={
                    active
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }
                >
                  <Icon />
                </span>

                {expanded && (
                  <span
                    className="menu-item-text"
                    suppressHydrationWarning
                  >
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
};

export default AppSidebar;