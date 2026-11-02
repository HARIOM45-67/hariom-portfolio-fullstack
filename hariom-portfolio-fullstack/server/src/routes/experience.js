import mongoose from 'mongoose';
import { Router } from 'express';
import { z } from 'zod';
import Experience from '../models/Experience.js';
import { requireAdmin, requireTrustedOrigin } from '../middleware/auth.js';

const router = Router();
const experienceSchema = z.object({
  organization: z.string().trim().min(2).max(120),
  position: z.string().trim().max(120).default(''),
  description: z.string().trim().max(3000).default(''),
  startDate: z.string().trim().max(40).default(''),
  endDate: z.string().trim().max(40).default(''),
  displayOrder: z.number().int().min(0).max(10000).default(0)
}).strict();

const initialExperience = {
  id: '',
  organization: 'Auspify Technologies',
  position: '',
  description: '',
  startDate: '',
  endDate: '',
  displayOrder: 0
};

function publicExperience(experience) {
  return {
    id: experience._id?.toString() || experience.id,
    organization: experience.organization,
    position: experience.position || '',
    description: experience.description || '',
    startDate: experience.startDate || '',
    endDate: experience.endDate || '',
    displayOrder: experience.displayOrder || 0
  };
}

router.get('/', async (_req, res, next) => {
  try {
    const experience = await Experience.find({}).sort({ displayOrder: 1, createdAt: 1 }).lean();
    return res.json({
      experience: experience.length > 0 ? experience.map(publicExperience) : [initialExperience]
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireAdmin, requireTrustedOrigin, async (req, res, next) => {
  const parsed = experienceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Provide valid experience details.' });
  try {
    const experience = await Experience.create(parsed.data);
    return res.status(201).json({ experience: publicExperience(experience) });
  } catch (error) {
    return next(error);
  }
});

router.put('/:experienceId', requireAdmin, requireTrustedOrigin, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.experienceId)) return res.status(400).json({ message: 'Invalid experience ID.' });
  const parsed = experienceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Provide valid experience details.' });
  try {
    const experience = await Experience.findByIdAndUpdate(
      req.params.experienceId,
      { $set: parsed.data },
      { new: true, runValidators: true }
    );
    if (!experience) return res.status(404).json({ message: 'Experience record not found.' });
    return res.json({ experience: publicExperience(experience) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:experienceId', requireAdmin, requireTrustedOrigin, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.experienceId)) return res.status(400).json({ message: 'Invalid experience ID.' });
  try {
    const experience = await Experience.findByIdAndDelete(req.params.experienceId);
    if (!experience) return res.status(404).json({ message: 'Experience record not found.' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
