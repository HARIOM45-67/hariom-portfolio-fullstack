import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  issuer: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  issueDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  credentialUrl: { type: String, trim: true, maxlength: 2048, default: '' },
  publicId: { type: String, required: true },
  secureUrl: { type: String, required: true },
  originalName: { type: String, required: true, maxlength: 255 },
  mediaType: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], required: true },
  bytes: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
  displayOrder: { type: Number, min: 0, max: 10000, default: 0 }
}, { timestamps: true });

certificateSchema.index({ displayOrder: 1, issueDate: -1 });

export default mongoose.model('Certificate', certificateSchema);
