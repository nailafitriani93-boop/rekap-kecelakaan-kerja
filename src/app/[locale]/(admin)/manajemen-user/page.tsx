
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_ROLES,
  DEFAULT_USERS,
  CURRENT_USER_STORAGE_KEY,
  ROLE_STORAGE_KEY,
  USER_STORAGE_KEY,
  USER_DEFAULTS_VERSION_KEY,
  USER_DEFAULTS_VERSION,
  USER_ACCESS_PAGES,
  ACTIVITY_LOG_STORAGE_KEY,
  type UserActivity,
  type ManagedUser,
  type UserRole,
  type UserGender,
} from "@/data/userData";

const EMPTY_ROLE = { name: "", description: "" };
const NOTICE_STORAGE_KEY = "ggf-user-management-notice";

const EMPTY_USER = {
  name: "",
  username: "",
  email: "",
  gender: "Pria" as UserGender,
  roleId: "",
  status: "Aktif" as ManagedUser["status"],
  accessPages: USER_ACCESS_PAGES.map((page) => page.id) as string[],
};

type ActiveSection = "role" | "user" | "daftar" | "aktivitas";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("ggf-user-updated"));
}

function avatarFor(gender: UserGender) {
  return gender === "Wanita"
    ? "/images/user/female.png"
    : "/images/user/male.png";
}

export default function ManajemenUserPage() {
  const [roles, setRoles] = useState<UserRole[]>(DEFAULT_ROLES);
  const [users, setUsers] = useState<ManagedUser[]>(DEFAULT_USERS);

  const [roleForm, setRoleForm] = useState(EMPTY_ROLE);
  const [userForm, setUserForm] = useState(EMPTY_USER);

  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);

  const [notice, setNotice] = useState("");
  const noticeTimeout = useRef<number | null>(null);
  const [activityLog, setActivityLog] = useState<UserActivity[]>([]);

  const [activeSection, setActiveSection] =
    useState<ActiveSection>("daftar");

  useEffect(() => {
    setActivityLog(readJson<UserActivity[]>(ACTIVITY_LOG_STORAGE_KEY, []));

    const defaultsVersion = window.localStorage.getItem(
      USER_DEFAULTS_VERSION_KEY
    );

    if (defaultsVersion !== USER_DEFAULTS_VERSION) {
      window.localStorage.setItem(
        ROLE_STORAGE_KEY,
        JSON.stringify(DEFAULT_ROLES)
      );

      window.localStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify(DEFAULT_USERS)
      );

      window.localStorage.setItem(
        CURRENT_USER_STORAGE_KEY,
        JSON.stringify(DEFAULT_USERS[0])
      );

      window.localStorage.setItem(
        USER_DEFAULTS_VERSION_KEY,
        USER_DEFAULTS_VERSION
      );

      setRoles(DEFAULT_ROLES);
      setUsers(DEFAULT_USERS);

      setUserForm((current) => ({
        ...current,
        roleId: DEFAULT_ROLES[0]?.id ?? "",
      }));

      window.dispatchEvent(new Event("ggf-user-updated"));
      return;
    }

    const storedRoles = readJson<UserRole[]>(
      ROLE_STORAGE_KEY,
      DEFAULT_ROLES
    );

    const storedUsers = readJson<ManagedUser[]>(
      USER_STORAGE_KEY,
      DEFAULT_USERS
    );

    setRoles(storedRoles.length ? storedRoles : DEFAULT_ROLES);
    setUsers(storedUsers.length ? storedUsers : DEFAULT_USERS);

    setUserForm((current) => ({
      ...current,
      roleId: storedRoles[0]?.id ?? DEFAULT_ROLES[0]?.id ?? "",
    }));
  }, []);

  useEffect(() => {
    const storedNotice = window.sessionStorage.getItem(NOTICE_STORAGE_KEY);
    if (!storedNotice) return;

    let pendingNotice: { message?: string; expiresAt?: number };

    try {
      pendingNotice = JSON.parse(storedNotice) as {
        message?: string;
        expiresAt?: number;
      };
    } catch (error) {
      console.error("Gagal membaca notifikasi akses:", error);
      window.sessionStorage.removeItem(NOTICE_STORAGE_KEY);
      return;
    }

    const remaining = Number(pendingNotice.expiresAt) - Date.now();
    if (!pendingNotice.message || remaining <= 0) {
      window.sessionStorage.removeItem(NOTICE_STORAGE_KEY);
      return;
    }

    setNotice(pendingNotice.message);
    noticeTimeout.current = window.setTimeout(() => {
      setNotice("");
      if (window.sessionStorage.getItem(NOTICE_STORAGE_KEY) === storedNotice) {
        window.sessionStorage.removeItem(NOTICE_STORAGE_KEY);
      }
      noticeTimeout.current = null;
    }, remaining);

    return () => {
      if (noticeTimeout.current !== null) {
        window.clearTimeout(noticeTimeout.current);
        noticeTimeout.current = null;
      }
    };
  }, []);

  useEffect(
    () => () => {
      if (noticeTimeout.current !== null) {
        window.clearTimeout(noticeTimeout.current);
      }
    },
    []
  );

  const roleMap = useMemo(
    () => new Map(roles.map((role) => [role.id, role.name])),
    [roles]
  );

  const logActivity = (aktivitas: string, detail: string) => {
    const current = readJson<ManagedUser>(
      CURRENT_USER_STORAGE_KEY,
      DEFAULT_USERS[0]
    );

    const logs = readJson<UserActivity[]>(
      ACTIVITY_LOG_STORAGE_KEY,
      []
    );

    const next = [
      {
        id: `activity-${Date.now()}`,
        waktu: new Date().toLocaleString("id-ID"),
        pengguna: current?.name || "Admin",
        aktivitas,
        detail,
      },
      ...logs,
    ].slice(0, 100);

    save(ACTIVITY_LOG_STORAGE_KEY, next);
    setActivityLog(next);
  };

  const persistRoles = (next: UserRole[]) => {
    setRoles(next);
    save(ROLE_STORAGE_KEY, next);
  };

  const persistUsers = (next: ManagedUser[]) => {
    setUsers(next);
    save(USER_STORAGE_KEY, next);
  };

  const flash = (message: string, persistAcrossRemount = false) => {
    if (noticeTimeout.current !== null) {
      window.clearTimeout(noticeTimeout.current);
    }

    const storedNotice = persistAcrossRemount
      ? JSON.stringify({ message, expiresAt: Date.now() + 2800 })
      : null;

    if (storedNotice) {
      window.sessionStorage.setItem(NOTICE_STORAGE_KEY, storedNotice);
    } else {
      window.sessionStorage.removeItem(NOTICE_STORAGE_KEY);
    }

    setNotice(message);
    noticeTimeout.current = window.setTimeout(() => {
      setNotice("");
      if (
        storedNotice &&
        window.sessionStorage.getItem(NOTICE_STORAGE_KEY) === storedNotice
      ) {
        window.sessionStorage.removeItem(NOTICE_STORAGE_KEY);
      }
      noticeTimeout.current = null;
    }, 2800);
  };

  const openRoleSection = () => {
    setActiveSection("role");
    setEditingRole(null);
    setRoleForm(EMPTY_ROLE);
  };

  const openUserSection = () => {
    setActiveSection("user");
    setEditingUser(null);
    setUserForm({
      ...EMPTY_USER,
      roleId: roles[0]?.id ?? "",
    });
  };

  const submitRole = (event: React.FormEvent) => {
    event.preventDefault();

    if (!roleForm.name.trim()) return;

    if (editingRole) {
      persistRoles(
        roles.map((role) =>
          role.id === editingRole
            ? {
                ...role,
                name: roleForm.name.trim(),
                description: roleForm.description.trim(),
              }
            : role
        )
      );

      logActivity("Memperbarui role", roleForm.name.trim());
      flash("Role berhasil diperbarui.");
    } else {
      const role: UserRole = {
        id: `role-${Date.now()}`,
        name: roleForm.name.trim(),
        description: roleForm.description.trim(),
      };

      persistRoles([...roles, role]);
      logActivity("Menambahkan role", role.name);
      flash("Role berhasil ditambahkan.");
    }

    setRoleForm(EMPTY_ROLE);
    setEditingRole(null);
  };

  const editRole = (role: UserRole) => {
    setEditingRole(role.id);
    setRoleForm({
      name: role.name,
      description: role.description,
    });
    setActiveSection("role");
  };

  const deleteRole = (roleId: string) => {
    if (users.some((user) => user.roleId === roleId)) {
      flash("Role tidak dapat dihapus karena masih digunakan oleh user.");
      return;
    }

    if (!window.confirm("Hapus role ini?")) return;

    const removedRole = roles.find((role) => role.id === roleId);

    persistRoles(roles.filter((role) => role.id !== roleId));

    logActivity("Menghapus role", removedRole?.name ?? roleId);
    flash("Role berhasil dihapus.");
  };

  const submitUser = (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !userForm.name.trim() ||
      !userForm.username.trim() ||
      !userForm.roleId
    ) {
      return;
    }

    const normalizedUsername = userForm.username.trim().toLowerCase();

    const duplicate = users.some(
      (user) =>
        user.username.toLowerCase() === normalizedUsername &&
        user.id !== editingUser
    );

    if (duplicate) {
      flash("Username sudah digunakan.");
      return;
    }

    if (editingUser) {
      const previousUser = users.find((user) => user.id === editingUser);
      const previousAccessPages =
        previousUser?.accessPages ??
        USER_ACCESS_PAGES.map((page) => page.id);
      const nextAccessPages = userForm.accessPages ?? [];
      const previousAccessSet = new Set(previousAccessPages);
      const nextAccessSet = new Set(nextAccessPages);
      const accessPagesChanged =
        previousAccessSet.size !== nextAccessSet.size ||
        [...previousAccessSet].some((page) => !nextAccessSet.has(page));

      const updated = users.map((user) =>
        user.id === editingUser
          ? {
              ...user,
              ...userForm,
              name: userForm.name.trim(),
              username: userForm.username.trim(),
              email: userForm.email.trim(),
            }
          : user
      );

      persistUsers(updated);
      logActivity("Memperbarui user", userForm.username.trim());
      if (accessPagesChanged) {
        flash("Akses berhasil diperbarui.", true);
      } else {
        flash("User berhasil diperbarui.");
      }
    } else {
      const user: ManagedUser = {
        id: `user-${Date.now()}`,
        ...userForm,
        name: userForm.name.trim(),
        username: userForm.username.trim(),
        email: userForm.email.trim(),
      };

      persistUsers([...users, user]);
      logActivity("Menambahkan user", user.username);
      flash("User berhasil ditambahkan.");
    }

    setUserForm({
      ...EMPTY_USER,
      roleId: roles[0]?.id ?? "",
    });

    setEditingUser(null);
    setActiveSection("daftar");
  };

  const editUser = (user: ManagedUser) => {
    setEditingUser(user.id);

    setUserForm({
      name: user.name,
      username: user.username,
      email: user.email,
      gender: user.gender,
      roleId: user.roleId,
      status: user.status,
      accessPages:
        user.accessPages ??
        USER_ACCESS_PAGES.map((page) => page.id),
    });

    setActiveSection("user");
  };

  const deleteUser = (id: string) => {
    if (!window.confirm("Hapus user ini?")) return;

    const removed = users.find((user) => user.id === id);

    persistUsers(users.filter((user) => user.id !== id));

    logActivity("Menghapus user", removed?.username ?? id);
    flash("User berhasil dihapus.");
  };

  const setActiveUser = (user: ManagedUser) => {
    window.localStorage.setItem(
      CURRENT_USER_STORAGE_KEY,
      JSON.stringify(user)
    );

    window.dispatchEvent(new Event("ggf-user-updated"));

    logActivity("Mengaktifkan profil", user.username);
    flash(`Profil aktif diganti ke ${user.name}.`);
  };

  const cancelRoleEdit = () => {
    setEditingRole(null);
    setRoleForm(EMPTY_ROLE);
  };

  const cancelUserEdit = () => {
    setEditingUser(null);
    setUserForm({
      ...EMPTY_USER,
      roleId: roles[0]?.id ?? "",
    });
  };

  const navigationItems: {
    id: ActiveSection;
    number: string;
    label: string;
  }[] = [
    { id: "role", number: "01", label: "Tambah Role" },
    { id: "user", number: "02", label: "Tambah User" },
    { id: "daftar", number: "03", label: "Daftar User" },
    { id: "aktivitas", number: "04", label: "Log Aktivitas" },
  ];

  return (
    <div className="space-y-4">
      {notice && (
        <div className="ggf-toast" role="status">
          <div className="ggf-toast-check">✓</div>
          <div>
            <strong>Informasi</strong>
            <span>{notice}</span>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Manajemen User
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Kelola role, pengguna, hak akses, dan riwayat aktivitas.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id === "role") {
                openRoleSection();
              } else if (item.id === "user") {
                openUserSection();
              } else {
                setActiveSection(item.id);
              }
            }}
            aria-pressed={activeSection === item.id}
            className={`flex min-h-[64px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
              activeSection === item.id
                ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "border-gray-200 bg-white text-gray-700 hover:border-emerald-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold dark:bg-gray-800">
              {item.number}
            </span>
            <span className="text-sm font-semibold">{item.label}</span>
          </button>
        ))}
      </div>

      {activeSection === "role" && (
        <section className="ggf-card">
          <div className="ggf-card-header">
            <div>
              <h2>{editingRole ? "Edit Role" : "Tambah Role"}</h2>
              <p>Buat dan kelola role sesuai kebutuhan aplikasi.</p>
            </div>
            <span className="ggf-section-number">01</span>
          </div>

          <form
            onSubmit={submitRole}
            className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.6fr_auto] lg:items-end"
          >
            <label className="ggf-label">
              Nama Role *
              <input
                className="ggf-input mt-2"
                value={roleForm.name}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, name: e.target.value })
                }
                placeholder="Contoh: Supervisor"
                required
              />
            </label>

            <label className="ggf-label">
              Deskripsi
              <input
                className="ggf-input mt-2"
                value={roleForm.description}
                onChange={(e) =>
                  setRoleForm({
                    ...roleForm,
                    description: e.target.value,
                  })
                }
                placeholder="Deskripsi penggunaan role"
              />
            </label>

            <div className="flex gap-2">
              <button className="ggf-submit" type="submit">
                {editingRole ? "Simpan Perubahan" : "Tambah Role"}
              </button>

              {editingRole && (
                <button
                  type="button"
                  className="ggf-close-filter"
                  onClick={cancelRoleEdit}
                >
                  Batal
                </button>
              )}
            </div>
          </form>

          <div className="mt-5 max-h-[42vh] overflow-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Deskripsi</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr
                    key={role.id}
                    className="border-b border-gray-50 dark:border-gray-800/70"
                  >
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white/90">
                      {role.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {role.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="mr-3 text-emerald-700 hover:underline"
                        onClick={() => editRole(role)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-orange-600 hover:underline"
                        onClick={() => deleteRole(role.id)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeSection === "user" && (
        <section className="ggf-card">
          <div className="ggf-card-header">
            <div>
              <h2>{editingUser ? "Edit User" : "Tambah User"}</h2>
              <p>
                Atur informasi pengguna, role, status, dan hak akses halaman.
              </p>
            </div>
            <span className="ggf-section-number">02</span>
          </div>

          <form
            onSubmit={submitUser}
            className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            <label className="ggf-label">
              Nama Lengkap *
              <input
                className="ggf-input mt-2"
                value={userForm.name}
                onChange={(e) =>
                  setUserForm({ ...userForm, name: e.target.value })
                }
                required
              />
            </label>

            <label className="ggf-label">
              Username *
              <input
                className="ggf-input mt-2"
                value={userForm.username}
                onChange={(e) =>
                  setUserForm({ ...userForm, username: e.target.value })
                }
                required
              />
            </label>

            <label className="ggf-label">
              Email
              <input
                type="email"
                className="ggf-input mt-2"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
                placeholder="Opsional"
              />
            </label>

            <label className="ggf-label">
              Jenis Kelamin
              <select
                className="ggf-input mt-2"
                value={userForm.gender}
                onChange={(e) =>
                  setUserForm({
                    ...userForm,
                    gender: e.target.value as UserGender,
                  })
                }
              >
                <option value="Pria">Pria</option>
                <option value="Wanita">Wanita</option>
              </select>
            </label>

            <label className="ggf-label">
              Role *
              <select
                className="ggf-input mt-2"
                value={userForm.roleId}
                onChange={(e) =>
                  setUserForm({ ...userForm, roleId: e.target.value })
                }
                required
              >
                <option value="">Pilih role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="ggf-label">
              Status
              <select
                className="ggf-input mt-2"
                value={userForm.status}
                onChange={(e) =>
                  setUserForm({
                    ...userForm,
                    status: e.target.value as ManagedUser["status"],
                  })
                }
              >
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </label>

            <fieldset className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 md:col-span-2 xl:col-span-3">
              <legend className="px-2 text-sm font-semibold text-gray-800 dark:text-white/90">
                Hak Akses Halaman
              </legend>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Centang halaman yang boleh diakses oleh user ini.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {USER_ACCESS_PAGES.map((page) => (
                  <label
                    key={page.id}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      checked={(userForm.accessPages ?? []).includes(page.id)}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          accessPages: e.target.checked
                            ? [...(userForm.accessPages ?? []), page.id]
                            : (userForm.accessPages ?? []).filter(
                                (id) => id !== page.id
                              ),
                        })
                      }
                    />
                    {page.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 md:col-span-2 xl:col-span-3">
              <button type="submit" className="ggf-submit">
                {editingUser ? "Simpan Perubahan" : "Tambah User"}
              </button>

              {editingUser && (
                <button
                  type="button"
                  className="ggf-close-filter"
                  onClick={cancelUserEdit}
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {activeSection === "daftar" && (
        <section className="ggf-card overflow-hidden">
          <div className="ggf-card-header">
            <div>
              <h2>Daftar User</h2>
              <p>{users.length} user tersimpan pada perangkat ini.</p>
            </div>
            <span className="ggf-section-number">03</span>
          </div>

          <div className="mt-4 max-h-[65vh] overflow-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-900">
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-50 dark:border-gray-800/70"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Image
                          src={avatarFor(user.gender)}
                          alt={user.gender}
                          width={44}
                          height={44}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-semibold text-gray-800 dark:text-white/90">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email || "Email belum diatur"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {user.username}
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        {roleMap.get(user.roleId) ?? "Role tidak ditemukan"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {user.status}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="mr-3 text-emerald-700 hover:underline"
                        onClick={() => setActiveUser(user)}
                      >
                        Pakai Profil
                      </button>
                      <button
                        type="button"
                        className="mr-3 text-emerald-700 hover:underline"
                        onClick={() => editUser(user)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-orange-600 hover:underline"
                        onClick={() => deleteUser(user.id)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Belum ada user yang terdaftar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeSection === "aktivitas" && (
        <section className="ggf-card overflow-hidden">
          <div className="ggf-card-header">
            <div>
              <h2>Log Aktivitas</h2>
              <p>
                Riwayat perubahan user dan role yang tercatat pada browser ini.
              </p>
            </div>
            <span className="ggf-section-number">04</span>
          </div>

          <div className="mt-4 max-h-[65vh] overflow-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-900">
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Pengguna</th>
                  <th className="px-4 py-3">Aktivitas</th>
                  <th className="px-4 py-3">Detail</th>
                </tr>
              </thead>

              <tbody>
                {activityLog.length ? (
                  activityLog.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-50 dark:border-gray-800/70"
                    >
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {item.waktu}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {item.pengguna}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                        {item.aktivitas}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {item.detail}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Belum ada aktivitas yang tercatat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
