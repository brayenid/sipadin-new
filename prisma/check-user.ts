import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

async function main() {
  // Simulasikan credentials yang dikirim oleh NextAuth
  const credentials = { username: "superadmin", password: "Admin@123" };
  console.log("📥 Credentials input:", credentials);

  const parsed = loginSchema.safeParse(credentials);
  console.log("✅ Zod parse success:", parsed.success);
  if (!parsed.success) {
    console.log("❌ Zod errors:", parsed.error);
    return;
  }
  console.log("📝 Parsed data:", parsed.data);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    include: { team: true },
  });
  console.log("👤 User found:", user ? user.username : "NOT FOUND");

  if (user) {
    const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    console.log("🔑 Password match:", isValid);

    if (isValid) {
      const returnValue = {
        id: user.id,
        name: user.name,
        email: user.username,
        role: user.role,
        teamId: user.teamId,
        teamName: user.team.name,
      };
      console.log("🎉 authorize() would return:", returnValue);
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
