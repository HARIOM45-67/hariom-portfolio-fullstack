import mongoose from 'mongoose';

const portfolioViewSchema = new mongoose.Schema({
  visitorId: { type: String, required: true, immutable: true },
  section: { type: String, immutable: true },
  project: { type: String, immutable: true },
  day: { type: String, required: true, immutable: true }
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'portfolio_views' });

portfolioViewSchema.index(
  { visitorId: 1, section: 1, day: 1 },
  { unique: true, partialFilterExpression: { section: { $exists: true } } }
);
portfolioViewSchema.index(
  { visitorId: 1, project: 1, day: 1 },
  { unique: true, partialFilterExpression: { project: { $exists: true } } }
);
portfolioViewSchema.index({ day: 1, section: 1 });

export default mongoose.model('PortfolioView', portfolioViewSchema);
