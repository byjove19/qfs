const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    console.log('🔧 Fixing wallet indexes...');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/qfs');
    
    const collection = mongoose.connection.collection('wallets');
    
    // Drop the problematic index
    try {
      await collection.dropIndex('user_1_currency_1');
      console.log('✅ Dropped problematic index: user_1_currency_1');
    } catch (e) {
      console.log('ℹ️ Index user_1_currency_1 already dropped or not found');
    }
    
    // Drop the duplicate userId index
    try {
      await collection.dropIndex('userId_1_currency_1');
      console.log('✅ Dropped duplicate index: userId_1_currency_1');
    } catch (e) {
      console.log('ℹ️ Index userId_1_currency_1 already dropped or not found');
    }
    
    // Drop the single field index
    try {
      await collection.dropIndex('userId_1');
      console.log('✅ Dropped single field index: userId_1');
    } catch (e) {
      console.log('ℹ️ Index userId_1 already dropped or not found');
    }
    
    // Recreate the correct compound index
    await collection.createIndex(
      { userId: 1, currency: 1 }, 
      { 
        unique: true,
        name: 'userId_currency_unique'
      }
    );
    console.log('✅ Recreated correct unique index: userId_currency_unique');
    
    // Check final indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Final indexes:');
    indexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('🔧 Index fix completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Index fix failed:', error);
    process.exit(1);
  }
}

fixIndexes();