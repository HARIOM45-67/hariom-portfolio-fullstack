import mongoose from 'mongoose';

const experienceSchema = new mongoose.Schema({
  organization: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  position: { type: String, trim: true, maxlength: 120, default: '' },
  description: { type: String, trim: true, maxlength: 3000, default: '' },
  startDate: { type: String, trim: true, maxlength: 40, default: '' },
  endDate: { type: String, trim: true, maxlength: 40, default: '' },
  displayOrder: { type: Number, min: 0, max: 10000, default: 0 }
}, { timestamps: true });

experienceSchema.index({ displayOrder: 1, createdAt: 1 });

export default mongoose.model('Experience', experienceSchema);
