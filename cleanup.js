// test-ticket-fix.js
const mongoose = require('mongoose');
require('dotenv').config();

async function testTicketCreation() {
  try {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/qfs';
    await mongoose.connect(dbUri);
    
    console.log('✅ Connected to MongoDB');
    
    // Clear model cache and load fresh
    delete mongoose.connection.models['Ticket'];
    const Ticket = require('./models/Ticket');
    
    // Test creating multiple tickets
    const testTickets = [];
    
    for (let i = 0; i < 3; i++) {
      const ticket = new Ticket({
        userId: new mongoose.Types.ObjectId(),
        subject: `Test Ticket ${i + 1}`,
        priority: 'medium',
        category: 'general',
        messages: [{
          senderId: new mongoose.Types.ObjectId(),
          message: `Test message ${i + 1}`
        }]
      });
      
      await ticket.save();
      testTickets.push(ticket.ticketNumber);
      console.log(`✅ Created ticket: ${ticket.ticketNumber}`);
    }
    
    console.log('\n🎉 SUCCESS! All tickets created without errors:');
    console.log(testTickets);
    
    // Check current indexes
    const indexes = await mongoose.connection.db.collection('tickets').getIndexes();
    console.log('\n📋 Current indexes:');
    Object.keys(indexes).forEach(indexName => {
      console.log(`  - ${indexName}:`, indexes[indexName].key);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testTicketCreation();