import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  key: { type: String, default: 'current', required: true, unique: true, immutable: true },
  publicId: { type: String, required: true },
  secureUrl: { type: String, required: true },
  originalName: { type: String, required: true, maxlength: 255 },
  bytes: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
  uploadDate: { type: Date, default: Date.now, required: true }
}, { timestamps: true });

export default mongoose.model('Resume', resumeSchema);
