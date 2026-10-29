
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { QueryResultRow } from "pg";

export const runtime = "nodejs";

type UserRow = QueryResultRow & {
  id: string;
  name: string;
  username: string;
  email: string;
  gender: string;
  role_id: string;
  status: string;
  access_pages: string[] | null;
};

function formatUser(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    gender: row.gender,
    roleId: row.role_id,
    status: row.status,
    accessPages: row.access_pages ?? [],
  };
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

function isUniqueError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export async function GET() {
  try {
    const result = await db.query<UserRow>(
      `SELECT id, name, username, email, gender,
              role_id, status, access_pages
       FROM managed_users
       ORDER BY created_at ASC`
    );

    return NextResponse.json({
      success: true,
      data: result.rows.map(formatUser),
    });
  } catch (error) {
    console.error("GET USERS ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil data user." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim() : "";
    const gender = body.gender;
    const roleId = body.roleId;
    const status = body.status;
    const accessPages = body.accessPages;

    if (!name || !username || !roleId) {
      return errorResponse(
        "Nama, username, dan role wajib diisi."
      );
    }

    if (!["Pria", "Wanita"].includes(gender)) {
      return errorResponse("Jenis kelamin tidak valid.");
    }

    if (!["Aktif", "Nonaktif"].includes(status)) {
      return errorResponse("Status user tidak valid.");
    }

    if (
      !Array.isArray(accessPages) ||
      !accessPages.every((page: unknown) => typeof page === "string")
    ) {
      return errorResponse("Hak akses tidak valid.");
    }

    const role = await db.query(
      "SELECT id FROM user_roles WHERE id = $1",
      [roleId]
    );

    if (!role.rowCount) {
      return errorResponse("Role tidak ditemukan.");
    }

    const id = `user-${crypto.randomUUID()}`;

    const result = await db.query<UserRow>(
      `INSERT INTO managed_users
       (id, name, username, email, gender, role_id,
        status, access_pages, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW(), NOW())
       RETURNING id, name, username, email, gender,
                 role_id, status, access_pages`,
      [
        id,
        name,
        username,
        email,
        gender,
        roleId,
        status,
        JSON.stringify(accessPages),
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "User berhasil ditambahkan.",
        data: formatUser(result.rows[0]),
      },
      { status: 201 }
    );
  } catch (error) {
    if (isUniqueError(error)) {
      return errorResponse(
        "Username atau data unik lainnya sudah digunakan.",
        409
      );
    }

    console.error("CREATE USER ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal menambahkan user." },
      { status: 500 }
    );
  }
}

async function updateUser(request: Request) {
  try {
    const body = await request.json();

    const id =
      typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return errorResponse("ID user wajib diisi.");
    }

    // Hanya kolom yang ditentukan di bawah ini yang dapat diperbarui.
    const fields: Array<{
      key: string;
      column: string;
      value: unknown;
    }> = [
      { key: "name", column: "name", value: body.name },
      { key: "username", column: "username", value: body.username },
      { key: "email", column: "email", value: body.email },
      { key: "gender", column: "gender", value: body.gender },
      { key: "roleId", column: "role_id", value: body.roleId },
      { key: "status", column: "status", value: body.status },
      {
        key: "accessPages",
        column: "access_pages",
        value: body.accessPages,
      },
    ];

    const providedFields = fields.filter((field) =>
      Object.prototype.hasOwnProperty.call(body, field.key)
    );

    if (providedFields.length === 0) {
      return errorResponse("Tidak ada data yang diperbarui.");
    }

    for (const field of providedFields) {
      if (
        ["name", "username", "email", "roleId"].includes(field.key) &&
        (typeof field.value !== "string" || !field.value.trim())
      ) {
        return errorResponse(`${field.key} tidak boleh kosong.`);
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(body, "gender") &&
      !["Pria", "Wanita"].includes(body.gender)
    ) {
      return errorResponse("Jenis kelamin tidak valid.");
    }

    if (
      Object.prototype.hasOwnProperty.call(body, "status") &&
      !["Aktif", "Nonaktif"].includes(body.status)
    ) {
      return errorResponse("Status user tidak valid.");
    }

    if (
      Object.prototype.hasOwnProperty.call(body, "accessPages") &&
      (
        !Array.isArray(body.accessPages) ||
        !body.accessPages.every(
          (page: unknown) => typeof page === "string"
        )
      )
    ) {
      return errorResponse("Hak akses tidak valid.");
    }

    if (Object.prototype.hasOwnProperty.call(body, "roleId")) {
      const role = await db.query(
        "SELECT id FROM user_roles WHERE id = $1",
        [body.roleId]
      );

      if (!role.rowCount) {
        return errorResponse("Role tidak ditemukan.");
      }
    }

    const values: unknown[] = [];
    const assignments = providedFields.map((field) => {
      let value = field.value;

      if (field.key === "accessPages") {
        value = JSON.stringify(field.value);
      } else if (typeof value === "string") {
        value = value.trim();
      }

      values.push(value);
      const parameter = `$${values.length}`;

      if (field.key === "accessPages") {
        return `${field.column} = ${parameter}::jsonb`;
      }

      return `${field.column} = ${parameter}`;
    });

    values.push(id);
    const idParameter = `$${values.length}`;

    const result = await db.query<UserRow>(
      `UPDATE managed_users
       SET ${assignments.join(", ")},
           updated_at = NOW()
       WHERE id = ${idParameter}
       RETURNING id, name, username, email, gender,
                 role_id, status, access_pages`,
      values
    );

    if (result.rowCount === 0) {
      return errorResponse("User tidak ditemukan.", 404);
    }

    return NextResponse.json({
      success: true,
      message: "Data user dan hak akses berhasil diperbarui.",
      data: formatUser(result.rows[0]),
    });
  } catch (error) {
    if (isUniqueError(error)) {
      return errorResponse(
        "Username atau data unik lainnya sudah digunakan.",
        409
      );
    }

    console.error("UPDATE USER ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal memperbarui data user." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  return updateUser(request);
}

export async function PATCH(request: Request) {
  return updateUser(request);
}
