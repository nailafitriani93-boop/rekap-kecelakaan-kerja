"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_ROLES, DEFAULT_USERS, CURRENT_USER_STORAGE_KEY, ROLE_STORAGE_KEY, USER_STORAGE_KEY, USER_DEFAULTS_VERSION_KEY, USER_DEFAULTS_VERSION, type ManagedUser, type UserRole, type UserGender } from "@/data/userData";

const EMPTY_ROLE = { name: "", description: "" };
const EMPTY_USER = { name: "", username: "", email: "", gender: "Pria" as UserGender, roleId: "", status: "Aktif" as ManagedUser["status"] };

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
  return gender === "Wanita" ? "/images/user/female.png" : "/images/user/male.png";
}

export default function ManajemenUserPage() {
  const [roles, setRoles] = useState<UserRole[]>(DEFAULT_ROLES);
  const [users, setUsers] = useState<ManagedUser[]>(DEFAULT_USERS);
  const [roleForm, setRoleForm] = useState(EMPTY_ROLE);
  const [userForm, setUserForm] = useState(EMPTY_USER);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const defaultsVersion = window.localStorage.getItem(USER_DEFAULTS_VERSION_KEY);
    if (defaultsVersion !== USER_DEFAULTS_VERSION) {
      // Reset satu kali saat versi default user berubah agar instalasi v6 langsung
      // memakai dua user awal yang ditentukan, termasuk bila browser sebelumnya
      // masih menyimpan data user dari versi lama. Setelah itu perubahan user
      // tetap dikelola dari halaman ini melalui localStorage.
      window.localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(DEFAULT_ROLES));
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(DEFAULT_USERS[0]));
      window.localStorage.setItem(USER_DEFAULTS_VERSION_KEY, USER_DEFAULTS_VERSION);
      setRoles(DEFAULT_ROLES);
      setUsers(DEFAULT_USERS);
      setUserForm((current) => ({ ...current, roleId: DEFAULT_ROLES[0].id }));
      window.dispatchEvent(new Event("ggf-user-updated"));
      return;
    }

    const storedRoles = readJson<UserRole[]>(ROLE_STORAGE_KEY, DEFAULT_ROLES);
    const storedUsers = readJson<ManagedUser[]>(USER_STORAGE_KEY, DEFAULT_USERS);
    setRoles(storedRoles.length ? storedRoles : DEFAULT_ROLES);
    setUsers(storedUsers.length ? storedUsers : DEFAULT_USERS);
    setUserForm((current) => ({ ...current, roleId: storedRoles[0]?.id ?? DEFAULT_ROLES[0].id }));
  }, []);

  const roleMap = useMemo(() => new Map(roles.map((role) => [role.id, role.name])), [roles]);

  const persistRoles = (next: UserRole[]) => {
    setRoles(next);
    save(ROLE_STORAGE_KEY, next);
  };

  const persistUsers = (next: ManagedUser[]) => {
    setUsers(next);
    save(USER_STORAGE_KEY, next);
  };

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  };

  const submitRole = (event: React.FormEvent) => {
    event.preventDefault();
    if (!roleForm.name.trim()) return;

    if (editingRole) {
      persistRoles(roles.map((role) => role.id === editingRole ? { ...role, name: roleForm.name.trim(), description: roleForm.description.trim() } : role));
      flash("Role berhasil diperbarui.");
    } else {
      const role: UserRole = { id: `role-${Date.now()}`, name: roleForm.name.trim(), description: roleForm.description.trim() };
      persistRoles([...roles, role]);
      flash("Role berhasil ditambahkan.");
    }
    setRoleForm(EMPTY_ROLE);
    setEditingRole(null);
  };

  const editRole = (role: UserRole) => {
    setEditingRole(role.id);
    setRoleForm({ name: role.name, description: role.description });
  };

  const deleteRole = (roleId: string) => {
    if (users.some((user) => user.roleId === roleId)) {
      flash("Role tidak dapat dihapus karena masih digunakan oleh user.");
      return;
    }
    if (!window.confirm("Hapus role ini?")) return;
    persistRoles(roles.filter((role) => role.id !== roleId));
  };

  const submitUser = (event: React.FormEvent) => {
    event.preventDefault();
    if (!userForm.name.trim() || !userForm.username.trim() || !userForm.roleId) return;

    if (editingUser) {
      const updated = users.map((user) => user.id === editingUser ? { ...user, ...userForm, name: userForm.name.trim(), username: userForm.username.trim(), email: userForm.email.trim() } : user);
      persistUsers(updated);
      flash("User berhasil diperbarui.");
    } else {
      const duplicate = users.some((user) => user.username.toLowerCase() === userForm.username.trim().toLowerCase());
      if (duplicate) {
        flash("Username sudah digunakan.");
        return;
      }
      const user: ManagedUser = { id: `user-${Date.now()}`, ...userForm, name: userForm.name.trim(), username: userForm.username.trim(), email: userForm.email.trim() };
      persistUsers([...users, user]);
      flash("User berhasil ditambahkan.");
    }
    setUserForm({ ...EMPTY_USER, roleId: roles[0]?.id ?? "" });
    setEditingUser(null);
  };

  const editUser = (user: ManagedUser) => {
    setEditingUser(user.id);
    setUserForm({ name: user.name, username: user.username, email: user.email, gender: user.gender, roleId: user.roleId, status: user.status });
  };

  const deleteUser = (id: string) => {
    if (!window.confirm("Hapus user ini?")) return;
    persistUsers(users.filter((user) => user.id !== id));
  };

  const setActiveUser = (user: ManagedUser) => {
    window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("ggf-user-updated"));
    flash(`Profil aktif diganti ke ${user.name}.`);
  };

  const cancelUserEdit = () => {
    setEditingUser(null);
    setUserForm({ ...EMPTY_USER, roleId: roles[0]?.id ?? "" });
  };

  return (
    <div className="space-y-6">
      {notice && <div className="ggf-toast" role="status"><div className="ggf-toast-check">✓</div><div><strong>Informasi</strong><span>{notice}</span></div></div>}

      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Manajemen User</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Kelola role dan user langsung dari halaman ini tanpa membuat data melalui database.</p>
      </div>

      <div className="ggf-alert-success"><b>Catatan penyimpanan</b><span>User dan role disimpan di browser menggunakan localStorage. Ini cocok untuk penggunaan lokal/prototipe; untuk akun perusahaan multi-komputer diperlukan server/database.</span></div>

      <section className="ggf-card">
        <div className="ggf-card-header"><div><h2>{editingRole ? "Edit Role" : "Tambah Role"}</h2><p>Buat role sesuai kebutuhan pengelolaan aplikasi.</p></div><span className="ggf-section-number">01</span></div>
        <form onSubmit={submitRole} className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.6fr_auto] lg:items-end">
          <label className="ggf-label">Nama Role *<input className="ggf-input mt-2" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="Contoh: Supervisor" required /></label>
          <label className="ggf-label">Deskripsi<input className="ggf-input mt-2" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="Deskripsi penggunaan role" /></label>
          <div className="flex gap-2"><button className="ggf-submit" type="submit">{editingRole ? "Simpan Perubahan" : "Tambah Role"}</button>{editingRole && <button type="button" className="ggf-close-filter" onClick={() => { setEditingRole(null); setRoleForm(EMPTY_ROLE); }}>Batal</button>}</div>
        </form>

        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400"><th className="px-4 py-3">Role</th><th className="px-4 py-3">Deskripsi</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody>{roles.map((role) => <tr key={role.id} className="border-b border-gray-50 dark:border-gray-800/70"><td className="px-4 py-4 font-semibold text-gray-800 dark:text-white/90">{role.name}</td><td className="px-4 py-4 text-gray-600 dark:text-gray-400">{role.description || "-"}</td><td className="px-4 py-4 text-right"><button type="button" className="mr-3 text-emerald-700 hover:underline" onClick={() => editRole(role)}>Edit</button><button type="button" className="text-orange-600 hover:underline" onClick={() => deleteRole(role.id)}>Hapus</button></td></tr>)}</tbody></table></div>
      </section>

      <section className="ggf-card">
        <div className="ggf-card-header"><div><h2>{editingUser ? "Edit User" : "Tambah User"}</h2><p>Avatar otomatis menggunakan ikon pria atau wanita yang kamu berikan.</p></div><span className="ggf-section-number">02</span></div>
        <form onSubmit={submitUser} className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <label className="ggf-label">Nama Lengkap *<input className="ggf-input mt-2" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required /></label>
          <label className="ggf-label">Username *<input className="ggf-input mt-2" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} required /></label>
          <label className="ggf-label">Email<input type="email" className="ggf-input mt-2" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="Opsional" /></label>
          <label className="ggf-label">Jenis Kelamin<select className="ggf-input mt-2" value={userForm.gender} onChange={(e) => setUserForm({ ...userForm, gender: e.target.value as UserGender })}><option value="Pria">Pria</option><option value="Wanita">Wanita</option></select></label>
          <label className="ggf-label">Role *<select className="ggf-input mt-2" value={userForm.roleId} onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })} required><option value="">Pilih role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
          <label className="ggf-label">Status<select className="ggf-input mt-2" value={userForm.status} onChange={(e) => setUserForm({ ...userForm, status: e.target.value as ManagedUser["status"] })}><option value="Aktif">Aktif</option><option value="Nonaktif">Nonaktif</option></select></label>
          <div className="md:col-span-2 xl:col-span-3 flex justify-end gap-2 border-t border-gray-100 pt-5 dark:border-gray-800"><button type="submit" className="ggf-submit">{editingUser ? "Simpan Perubahan" : "Tambah User"}</button>{editingUser && <button type="button" className="ggf-close-filter" onClick={cancelUserEdit}>Batal</button>}</div>
        </form>
      </section>

      <section className="ggf-card overflow-hidden">
        <div className="ggf-card-header"><div><h2>Daftar User</h2><p>{users.length} user tersimpan pada perangkat ini.</p></div><span className="ggf-section-number">03</span></div>
        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400"><th className="px-4 py-3">User</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-gray-50 dark:border-gray-800/70"><td className="px-4 py-4"><div className="flex items-center gap-3"><Image src={avatarFor(user.gender)} alt={user.gender} width={44} height={44} className="h-11 w-11 rounded-full object-cover"/><div><div className="font-semibold text-gray-800 dark:text-white/90">{user.name}</div><div className="text-xs text-gray-500 dark:text-gray-400">{user.email || "Email belum diatur"}</div></div></div></td><td className="px-4 py-4 text-gray-600 dark:text-gray-400">{user.username}</td><td className="px-4 py-4"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">{roleMap.get(user.roleId) ?? "Role tidak ditemukan"}</span></td><td className="px-4 py-4 text-gray-600 dark:text-gray-400">{user.status}</td><td className="px-4 py-4 text-right"><button type="button" className="mr-3 text-emerald-700 hover:underline" onClick={() => setActiveUser(user)}>Pakai Profil</button><button type="button" className="mr-3 text-emerald-700 hover:underline" onClick={() => editUser(user)}>Edit</button><button type="button" className="text-orange-600 hover:underline" onClick={() => deleteUser(user.id)}>Hapus</button></td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}
