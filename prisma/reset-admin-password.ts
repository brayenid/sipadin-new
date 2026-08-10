import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

async function main() {
  const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })
  
  const passwordHash = await bcrypt.hash('Admin@123', 12)
  
  const user = await prisma.user.update({
    where: { username: 'superadmin' },
    data: { passwordHash }
  })
  
  console.log(`Password for user "superadmin" (ID: ${user.id}) in V2 has been reset to "Admin@123"`)
  await prisma.$disconnect()
  await pool.end()
}

main().catch(console.error)
