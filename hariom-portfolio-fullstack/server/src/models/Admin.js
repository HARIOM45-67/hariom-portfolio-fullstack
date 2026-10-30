import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 254,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    select: false,
    minlength: 12,
    maxlength: 72,
    validate: {
      validator: value => Buffer.byteLength(value, 'utf8') <= 72,
      message: 'Password cannot exceed 72 UTF-8 bytes.'
    }
  },
  tokenVersion: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

adminSchema.index({ email: 1 }, { unique: true });
adminSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});
adminSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model('Admin', adminSchema);
