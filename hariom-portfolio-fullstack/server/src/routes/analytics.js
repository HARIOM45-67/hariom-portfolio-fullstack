import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import ContactQuery from '../models/Contact.js';
import Project from '../models/Project.js';
import PortfolioView from '../models/PortfolioView.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const sections = [
  'home', 'about', 'skills', 'projects', 'experience', 'education', 'certifications',
  'github', 'coding-profiles', 'professional-profiles', 'services', 'blog', 'contact',
  'resume', 'testimonials', 'analytics', 'footer'
];
const visitorIdSchema = z.string().uuid();
const eventSchema = z.union([
  z.object({ visitorId: visitorIdSchema, section: z.enum(sections) }).strict(),
  z.object({
    visitorId: visitorIdSchema,
    project: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/)
  }).strict()
]);

router.post('/view', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 90,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}), async (req, res, next) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Provide a valid analytics event.' });

  const event = parsed.data;
  const { visitorId } = event;
  const day = new Date().toISOString().slice(0, 10);
  try {
    await PortfolioView.updateOne(
      { visitorId, ...event, day },
      { $setOnInsert: { visitorId, ...event, day } },
      { upsert: true }
    );
    return res.status(202).end();
  } catch (error) {
    if (error.code === 11000) return res.status(202).end();
    return next(error);
  }
});

router.get('/summary', requireAdmin, async (_req, res, next) => {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 29);
  const sinceDay = start.toISOString().slice(0, 10);
  const filter = { day: { $gte: sinceDay } };

  try {
    const [pageViews, visitors, popularSections, popularProjects, contactSubmissions] = await Promise.all([
      PortfolioView.countDocuments({ ...filter, section: { $exists: true } }),
      PortfolioView.distinct('visitorId', filter),
      PortfolioView.aggregate([
        { $match: { ...filter, section: { $exists: true } } },
        { $group: { _id: '$section', views: { $sum: 1 } } },
        { $sort: { views: -1, _id: 1 } },
        { $limit: 5 }
      ]),
      PortfolioView.aggregate([
        { $match: { ...filter, project: { $exists: true } } },
        { $group: { _id: '$project', views: { $sum: 1 } } },
        { $sort: { views: -1, _id: 1 } },
        { $limit: 5 }
      ]),
      ContactQuery.countDocuments({})
    ]);
    const projects = await Project.find({ slug: { $in: popularProjects.map(({ _id }) => _id) } })
      .select('slug name')
      .lean();
    const projectNames = new Map(projects.map(project => [project.slug, project.name]));

    return res.json({
      periodDays: 30,
      visitors: visitors.length,
      pageViews,
      popularSections: popularSections.map(({ _id, views }) => ({ section: _id, views })),
      popularProjects: popularProjects.map(({ _id, views }) => ({
        slug: _id,
        name: projectNames.get(_id) || _id,
        views
      })),
      contactSubmissions
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
