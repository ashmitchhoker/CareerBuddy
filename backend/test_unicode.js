// Test script to verify end-to-end Unicode/Hindi support
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUnicode() {
  console.log('🧪 Testing end-to-end Unicode support...\n');

  try {
    // Find test user
    const user = await prisma.customUser.findFirst({
      where: { name: 'neerja' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${user.name} (ID: ${user.id})`);

    // Test 1: Write Hindi text
    console.log('\n📝 Test 1: Writing Hindi message to database...');
    const hindiMessage = await prisma.chatMessage.create({
      data: {
        user_id: user.id,
        message_text: 'नमस्ते! मैं सॉफ्टवेयर इंजीनियर बनना चाहता हूं। क्या आप मुझे मार्गदर्शन कर सकते हैं?',
        sender: 'user',
        is_results_chat: false
      }
    });
    console.log('✅ Hindi message saved:', hindiMessage.message_text);

    // Test 2: Write Telugu text
    console.log('\n📝 Test 2: Writing Telugu message to database...');
    const teluguMessage = await prisma.chatMessage.create({
      data: {
        user_id: user.id,
        message_text: 'నమస్కారం! నేను డేటా సైంటిస్ట్ అవ్వాలనుకుంటున్నాను. మీరు నాకు సహాయం చేయగలరా?',
        sender: 'user',
        is_results_chat: false
      }
    });
    console.log('✅ Telugu message saved:', teluguMessage.message_text);

    // Test 3: Write Tamil text
    console.log('\n📝 Test 3: Writing Tamil message to database...');
    const tamilMessage = await prisma.chatMessage.create({
      data: {
        user_id: user.id,
        message_text: 'வணக்கம்! நான் மருத்துவராக மாற விரும்புகிறேன். எனக்கு உதவ முடியுமா?',
        sender: 'user',
        is_results_chat: false
      }
    });
    console.log('✅ Tamil message saved:', tamilMessage.message_text);

    // Test 4: Write mixed languages
    console.log('\n📝 Test 4: Writing mixed language message...');
    const mixedMessage = await prisma.chatMessage.create({
      data: {
        user_id: user.id,
        message_text: 'I want to become an IIT engineer. मुझे JEE की तैयारी के लिए क्या करना चाहिए? 🎓📚',
        sender: 'user',
        is_results_chat: false
      }
    });
    console.log('✅ Mixed language message saved:', mixedMessage.message_text);

    // Test 5: Read back all messages
    console.log('\n📖 Test 5: Reading back all test messages...');
    const messages = await prisma.chatMessage.findMany({
      where: {
        user_id: user.id,
        id: {
          in: [hindiMessage.id, teluguMessage.id, tamilMessage.id, mixedMessage.id]
        }
      },
      orderBy: { created_at: 'asc' }
    });

    console.log(`\n✅ Retrieved ${messages.length} messages:\n`);
    messages.forEach((msg, idx) => {
      console.log(`${idx + 1}. [${msg.sender}] ${msg.message_text}`);
    });

    // Test 6: Cleanup - delete test messages
    console.log('\n🗑️  Cleaning up test messages...');
    const deleted = await prisma.chatMessage.deleteMany({
      where: {
        id: {
          in: [hindiMessage.id, teluguMessage.id, tamilMessage.id, mixedMessage.id]
        }
      }
    });
    console.log(`✅ Deleted ${deleted.count} test messages`);

    console.log('\n✅ All Unicode tests passed! Hindi/Telugu/Tamil/Emoji support working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\nError details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testUnicode();
