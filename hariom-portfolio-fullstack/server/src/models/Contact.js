import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const contactSchema = new mongoose.Schema({
  queryId: { type: String, default: randomUUID, required: true, unique: true, immutable: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 120,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  subject: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  message: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
  isRead: { type: Boolean, default: false }
}, { timestamps: true, collection: 'contacts' });

contactSchema.index({ createdAt: -1 });
contactSchema.index({ isRead: 1, createdAt: -1 });

export default mongoose.model('ContactQuery', contactSchema);