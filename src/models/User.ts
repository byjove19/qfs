import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string; // Make optional
  dateOfBirth?: Date; // Make optional
  address?: string; // Make optional
  city?: string; // Make optional
  country?: string; // Make optional
  postalCode?: string; // Make optional
  role: 'user' | 'admin' | 'superadmin';
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastLogin?: Date;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  fullName: string;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  phone: { type: String }, // Remove required: true
  dateOfBirth: { type: Date }, // Remove required: true
  address: { type: String }, // Remove required: true
  city: { type: String }, // Remove required: true
  country: { type: String }, // Remove required: true
  postalCode: { type: String }, // Remove required: true
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  lastLogin: Date,
  avatar: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.virtual('fullName').get(function(this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.index({ role: 1 });

export default model<IUser>('User', userSchema);