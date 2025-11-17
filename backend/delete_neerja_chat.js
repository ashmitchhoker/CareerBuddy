// Quick script to delete all chat messages for user "neerja"
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Find user neerja (case-sensitive search)
    const user = await prisma.customUser.findFirst({
      where: {
        OR: [
          { name: { contains: 'Neerja' } },
          { name: { contains: 'neerja' } },
          { email: { contains: 'neerja' } }
        ]
      }
    });

    if (!user) {
      console.log('❌ User "neerja" not found');
      return;
    }

    console.log(`✅ Found user: ${user.name} (ID: ${user.id}, Email: ${user.email})`);

    // Delete all chat messages for this user
    const deleted = await prisma.chatMessage.deleteMany({
      where: {
        user_id: user.id
      }
    });

    console.log(`🗑️  Deleted ${deleted.count} chat messages for user ${user.name}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
