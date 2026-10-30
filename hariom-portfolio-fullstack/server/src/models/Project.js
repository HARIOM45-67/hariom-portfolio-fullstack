import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  stack: { type: [String], default: [], validate: values => values.length <= 20 },
  liveUrl: { type: String, trim: true, maxlength: 2048, default: '' },
  repoUrl: { type: String, trim: true, maxlength: 2048, default: '' },
  featured: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

projectSchema.index({ featured: -1, displayOrder: 1, createdAt: -1 });

export default mongoose.model('Project', projectSchema);
