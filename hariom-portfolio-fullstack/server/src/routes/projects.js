import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Project from '../models/Project.js';
import { requireAdmin, requireTrustedOrigin } from '../middleware/auth.js';

const router = Router();
const secureUrl = z.string().url().refine(value => new URL(value).protocol === 'https:');
const optionalSecureUrl = z.union([z.literal(''), secureUrl]).default('');
const projectSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(2000),
  problemSolved: z.string().trim().max(1000).default(''),
  imageUrl: optionalSecureUrl,
  stack: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  liveUrl: optionalSecureUrl,
  repoUrl: optionalSecureUrl,
  featured: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(10000).default(0)
}).strict();

function slugify(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'project';
}

function publicProject(project) {
  return {
    id: project._id.toString(),
    name: project.name,
    slug: project.slug,
    description: project.description,
    problemSolved: project.problemSolved || '',
    imageUrl: project.imageUrl || '',
    stack: project.stack,
    liveUrl: project.liveUrl,
    repoUrl: project.repoUrl,
    featured: project.featured,
    displayOrder: project.displayOrder,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}

function isProjectId(value) {
  return mongoose.isValidObjectId(value);
}

router.get('/', async (_req, res, next) => {
  try {
    const projects = await Project.find({})
      .sort({ featured: -1, displayOrder: 1, createdAt: -1 })
      .lean();
    return res.json({ projects: projects.map(publicProject) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireAdmin, requireTrustedOrigin, async (req, res, next) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Provide valid project details.' });
  try {
    const project = await Project.create({ ...parsed.data, slug: slugify(parsed.data.name) });
    return res.status(201).json({ project: publicProject(project) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A project with this name already exists.' });
    return next(error);
  }
});

router.put('/:projectId', requireAdmin, requireTrustedOrigin, async (req, res, next) => {
  if (!isProjectId(req.params.projectId)) return res.status(400).json({ message: 'Invalid project ID.' });
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Provide valid project details.' });

  try {
    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      { $set: { ...parsed.data, slug: slugify(parsed.data.name) } },
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    return res.json({ project: publicProject(project) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A project with this name already exists.' });
    return next(error);
  }
});

router.delete('/:projectId', requireAdmin, requireTrustedOrigin, async (req, res, next) => {
  if (!isProjectId(req.params.projectId)) return res.status(400).json({ message: 'Invalid project ID.' });
  try {
    const project = await Project.findByIdAndDelete(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
