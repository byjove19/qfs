const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const createAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qfs');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@qfs.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const adminUser = new User({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@qfs.com',
      password: 'admin@qfs78+here',
      role: 'superadmin',
      isVerified: true,
      phone: '+1234567890',
      address: {
        street: 'Admin Street',
        city: 'Admin City',
        state: 'Admin State',
        country: 'Admin Country',
        zipCode: '12345'
      }
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@qfs.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    mongoose.connection.close();
  }
};

createAdminUser();