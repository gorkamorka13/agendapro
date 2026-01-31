import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const count = await prisma.user.count()
    console.log(`Total users in database: ${count}`)

    const users = await prisma.user.findMany({
        take: 5,
        select: { id: true, name: true, phone: true }
    })
    console.log('First 5 users:', JSON.stringify(users, null, 2))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
