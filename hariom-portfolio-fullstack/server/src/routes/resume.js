import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { Router } from 'express';
import Resume from '../models/Resume.js';
import { requireAdmin, requireTrustedOrigin } from '../middleware/auth.js';
import { deleteResume, uploadResume } from '../services/cloudinary.js';
import HttpError from '../utils/HttpError.js';

const router = Router();
const maxFileSize = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize, files: 1 },
  fileFilter(_req, file, callback) {
    if (file.mimetype !== 'application/pdf' || !/\.pdf$/i.test(file.originalname)) {
      return callback(new HttpError(400, 'Upload a PDF file only.'));
    }
    return callback(null, true);
  }
});

function publicResume(resume) {
  return {
    originalName: resume.originalName,
    bytes: resume.bytes,
    uploadedAt: resume.uploadDate,
    downloadUrl: '/api/resume/download'
  };
}

router.get('/', async (_req, res, next) => {
  try {
    const resume = await Resume.findOne({ key: 'current' }).lean();
    return res.json({ resume: resume ? publicResume(resume) : null });
  } catch (error) {
    return next(error);
  }
});

router.get('/download', async (_req, res, next) => {
  try {
    const resume = await Resume.findOne({ key: 'current' }).select('secureUrl').lean();
    if (!resume) return res.status(404).json({ message: 'No resume has been published.' });
    res.set('Cache-Control', 'no-store');
    return res.redirect(302, resume.secureUrl);
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireAdmin, requireTrustedOrigin, upload.single('resume'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a PDF file to upload.' });
  if (req.file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    return res.status(400).json({ message: 'The uploaded file is not a valid PDF.' });
  }

  try {
    const publicId = `portfolio/resumes/${randomUUID()}`;
    const originalName = req.file.originalname
      .split(/[\\/]/)
      .pop()
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .slice(0, 255) || 'resume.pdf';
    const current = await Resume.findOne({ key: 'current' });
    let uploaded;
    try {
      uploaded = await uploadResume(req.file.buffer, publicId);
    } catch (error) {
      if (error.statusCode === 503) return next(new HttpError(503, error.message));
      console.error('Cloudinary resume upload failed:', { name: error.name, statusCode: error.http_code });
      return next(new HttpError(502, 'Resume upload failed. The currently published resume was left unchanged.'));
    }

    let saved;
    try {
      saved = await Resume.findOneAndUpdate(
        { key: 'current' },
        { $set: {
          publicId,
          secureUrl: uploaded.secure_url,
          originalName,
          bytes: req.file.size,
          uploadDate: new Date()
        } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      try {
        await deleteResume(publicId);
      } catch (cleanupError) {
        console.error('Unable to remove unreferenced resume upload:', { name: cleanupError.name, statusCode: cleanupError.http_code });
      }
      return next(error);
    }

    if (current && current.publicId !== publicId) {
      try {
        await deleteResume(current.publicId);
      } catch (error) {
        console.error('Unable to remove replaced resume file:', { name: error.name, statusCode: error.http_code });
      }
    }

    return res.status(201).json({ resume: publicResume(saved) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/', requireAdmin, requireTrustedOrigin, async (_req, res, next) => {
  try {
    const current = await Resume.findOne({ key: 'current' });
    if (!current) return res.status(404).json({ message: 'No resume has been published.' });
    try {
      await deleteResume(current.publicId);
    } catch (error) {
      if (error.statusCode === 503) return next(new HttpError(503, error.message));
      console.error('Cloudinary resume deletion failed:', { name: error.name, statusCode: error.http_code });
      return next(new HttpError(502, 'Resume deletion failed. The published resume was left unchanged.'));
    }
    await current.deleteOne();
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
