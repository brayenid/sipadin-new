"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

/**
 * Memastikan bahwa user yang merequest adalah SUPER_ADMIN.
 * Juga memastikan scope teamId.
 */
async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Hanya SUPER_ADMIN yang diizinkan.");
  }
  return session.user;
}

export async function getAkuns() {
  const user = await requireSuperAdmin();
  
  const users = await prisma.user.findMany({
    where: {
      teamId: user.teamId,
    },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      teamId: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return users;
}

export async function createAkun(data: {
  name: string;
  username: string;
  passwordRaw: string;
  role: UserRole;
}) {
  const sessionUser = await requireSuperAdmin();

  // Validasi unik username
  const existing = await prisma.user.findUnique({
    where: { username: data.username },
  });
  if (existing) {
    throw new Error("Username sudah digunakan.");
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(data.passwordRaw, salt);

  await prisma.user.create({
    data: {
      name: data.name,
      username: data.username,
      passwordHash,
      role: data.role,
      teamId: sessionUser.teamId,
    },
  });

  revalidatePath("/dashboard/akun");
}

export async function updateAkun(
  id: string,
  data: {
    name: string;
    username: string;
    passwordRaw?: string;
    role: UserRole;
  }
) {
  const sessionUser = await requireSuperAdmin();

  // Validasi akun yg diedit adalah di team yang sama
  const targetUser = await prisma.user.findFirst({
    where: { id, teamId: sessionUser.teamId },
  });

  if (!targetUser) {
    throw new Error("Akun tidak ditemukan atau Anda tidak memiliki akses.");
  }

  // Jika ubah username, cek apakah sudah dipakai user lain
  if (data.username !== targetUser.username) {
    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existing) {
      throw new Error("Username sudah digunakan oleh akun lain.");
    }
  }

  const updateData: any = {
    name: data.name,
    username: data.username,
    role: data.role,
  };

  if (data.passwordRaw && data.passwordRaw.trim().length > 0) {
    const salt = await bcrypt.genSalt(10);
    updateData.passwordHash = await bcrypt.hash(data.passwordRaw, salt);
  }

  await prisma.user.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/dashboard/akun");
}

export async function deleteAkun(id: string) {
  const sessionUser = await requireSuperAdmin();

  const targetUser = await prisma.user.findFirst({
    where: { id, teamId: sessionUser.teamId },
  });

  if (!targetUser) {
    throw new Error("Akun tidak ditemukan atau Anda tidak memiliki akses.");
  }

  if (targetUser.role === "SUPER_ADMIN") {
    throw new Error("Akun dengan role SUPER_ADMIN tidak boleh dihapus.");
  }

  await prisma.user.delete({
    where: { id },
  });

  revalidatePath("/dashboard/akun");
}

export async function checkRateLimitStatus(username: string) {
  const { checkLoginRateLimit } = await import("@/lib/rate-limit");
  return checkLoginRateLimit(username);
}
