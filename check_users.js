const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    try {
        const count = await prisma.user.count()
        console.log(`XXX_RESULT: Total users in database: ${count}`)

        if (count > 0) {
            const users = await prisma.user.findMany({
                take: 3,
                select: { id: true, name: true, phone: true }
            })
            console.log('XXX_RESULT: First 3 users:', JSON.stringify(users, null, 2))
        }
    } catch (e) {
        console.error('XXX_ERROR:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
