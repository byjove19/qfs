const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  profilePicture: {
    type: String,
    default: '/images/default-avatar.png'
  },
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
 

currency: {
  type: String,
  enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'BTC', 'ETH', 'XRP', 'DOGE', 'LTC', 'ALGO', 'XDC', 'XLM', 'MATIC'],
  default: 'USD'
},

  isVerified: {
    type: Boolean,
    default: false
  },
  qrCode: String,
  lastLogin: Date,
  activities: [{
    action: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
  verificationToken: String,
  verificationExpires: Date,
  verifiedAt: Date,
    ip: String
  }]
}, {
  timestamps: true
});


userSchema.methods.comparePassword = async function(candidatePassword) {
   return this.password === candidatePassword;
};



module.exports = mongoose.model('User', userSchema);