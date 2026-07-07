"use server";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { z } from "zod";

const setupSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

function getPrisma() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export async function setupSuperadmin(data: { username: string; password: string }) {
  const parsed = setupSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Username minimal 3 karakter, password minimal 6 karakter." };
  }

  const { username, password } = parsed.data;
  const prisma = getPrisma();

  try {
    // Check if any SUPER_ADMIN already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
    });

    if (existingAdmin) {
      return { success: false, error: "Superadmin sudah ada di dalam database. Akses ditolak." };
    }

    // Create Team "Sekretariat Daerah"
    let team = await prisma.team.findUnique({ where: { name: "Sekretariat Daerah" } });
    if (!team) {
      team = await prisma.team.create({
        data: { name: "Sekretariat Daerah" },
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create superadmin user
    await prisma.user.create({
      data: {
        username,
        name: "Super Administrator",
        passwordHash,
        role: "SUPER_ADMIN",
        teamId: team.id,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("[setup] error:", error);
    return { success: false, error: error.message || "Terjadi kesalahan internal." };
  } finally {
    await prisma.$disconnect();
  }
}
