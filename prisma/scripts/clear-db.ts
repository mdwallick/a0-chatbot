import { prisma } from "@/lib/prisma"

async function main() {
  // Delete in the correct order if there are foreign key constraints
  await prisma.message.deleteMany({})
  await prisma.chatThread.deleteMany({})
  await prisma.grantedScope.deleteMany({})
  await prisma.xboxCredential.deleteMany({})
  // Add more tables here if needed

  console.log("✅ Database cleared.")
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
