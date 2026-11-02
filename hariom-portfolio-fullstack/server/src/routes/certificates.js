import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Certificate from '../models/Certificate.js';
import { requireAdmin, requireTrustedOrigin } from '../middleware/auth.js';
import { deleteCertificate, uploadCertificate } from '../services/cloudinary.js';
import HttpError from '../utils/HttpError.js';

const router = Router();
const maxFileSize = 5 * 1024 * 1024;
const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize, files: 1 },
  fileFilter(_req, file, callback) {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(new HttpError(400, 'Upload a PDF, JPEG, PNG, or WebP certificate.'));
    }
    return callback(null, true);
  }
});
const credentialUrl = z.union([
  z.literal(''),
  z.string().url().refine(value => new URL(value).protocol === 'https:')
]).default('');
const certificateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  issuer: z.string().trim().min(2).max(160),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }),
  credentialUrl,
  displayOrder: z.coerce.number().int().min(0).max(10000).default(0)
}).strict();

function publicCertificate(certificate) {
  return {
    id: certificate._id.toString(),
    title: certificate.title,
    issuer: certificate.issuer,
    issueDate: certificate.issueDate,
    credentialUrl: certificate.credentialUrl || '',
    mediaUrl: certificate.secureUrl,
    mediaType: certificate.mediaType,
    originalName: certificate.originalName,
    bytes: certificate.bytes,
    displayOrder: certificate.displayOrder,
    createdAt: certificate.createdAt,
    updatedAt: certificate.updatedAt
  };
}

function hasValidSignature(file) {
  const bytes = file.buffer;
  if (file.mimetype === 'application/pdf') return bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  if (file.mimetype === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return file.mimetype === 'image/webp'
    && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

function safeOriginalName(originalName) {
  return originalName
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 255) || 'certificate';
}

router.get('/', async (_req, res, next) => {
  try {
    const certificates = await Certificate.find({}).sort({ displayOrder: 1, issueDate: -1 }).lean();
    return res.json({ certificates: certificates.map(publicCertificate) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireAdmin, requireTrustedOrigin, upload.single('certificate'), async (req, res, next) => {
  const parsed = certificateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Provide a title, issuer, and valid issue date.' });
  if (!req.file) return res.status(400).json({ message: 'Attach a certificate image or PDF.' });
  if (!hasValidSignature(req.file)) return res.status(400).json({ message: 'The uploaded file content does not match its type.' });

  const fileExtension = req.file.mimetype === 'application/pdf' ? '.pdf' : '';
  const publicId = `portfolio/certificates/${randomUUID()}${fileExtension}`;
  let uploaded;
  try {
    uploaded = await uploadCertificate(req.file.buffer, publicId, req.file.mimetype);
  } catch (error) {
    if (error.statusCode === 503) return next(new HttpError(503, error.message));
    console.error('Cloudinary certificate upload failed:', { name: error.name, statusCode: error.http_code });
    return next(new HttpError(502, 'Certificate upload failed.'));
  }

  try {
    const certificate = await Certificate.create({
      ...parsed.data,
      publicId,
      secureUrl: uploaded.secure_url,
      originalName: safeOriginalName(req.file.originalname),
      mediaType: req.file.mimetype,
      bytes: req.file.size
    });
    return res.status(201).json({ certificate: publicCertificate(certificate) });
  } catch (error) {
    try {
      await deleteCertificate(publicId, req.file.mimetype);
    } catch (cleanupError) {
      console.error('Unable to remove unreferenced certificate upload:', { name: cleanupError.name, statusCode: cleanupError.http_code });
    }
    return next(error);
  }
});

router.put('/:certificateId', requireAdmin, requireTrustedOrigin, upload.single('certificate'), async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.certificateId)) return res.status(400).json({ message: 'Invalid certificate ID.' });
  const parsed = certificateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Provide valid certificate details.' });
  if (req.file && !hasValidSignature(req.file)) return res.status(400).json({ message: 'The uploaded file content does not match its type.' });

  try {
    const current = await Certificate.findById(req.params.certificateId);
    if (!current) return res.status(404).json({ message: 'Certificate not found.' });

    const previousPublicId = current.publicId;
    const previousMediaType = current.mediaType;
    let uploaded;
    let publicId;
    if (req.file) {
      const fileExtension = req.file.mimetype === 'application/pdf' ? '.pdf' : '';
      publicId = `portfolio/certificates/${randomUUID()}${fileExtension}`;
      try {
        uploaded = await uploadCertificate(req.file.buffer, publicId, req.file.mimetype);
      } catch (error) {
        if (error.statusCode === 503) return next(new HttpError(503, error.message));
        console.error('Cloudinary certificate replacement failed:', { name: error.name, statusCode: error.http_code });
        return next(new HttpError(502, 'Certificate update failed. The published certificate was left unchanged.'));
      }
    }

    Object.assign(current, parsed.data);
    if (req.file) {
      current.publicId = publicId;
      current.secureUrl = uploaded.secure_url;
      current.originalName = safeOriginalName(req.file.originalname);
      current.mediaType = req.file.mimetype;
      current.bytes = req.file.size;
    }
    try {
      await current.save();
    } catch (error) {
      if (req.file) {
        try {
          await deleteCertificate(publicId, req.file.mimetype);
        } catch (cleanupError) {
          console.error('Unable to remove unreferenced certificate replacement:', { name: cleanupError.name, statusCode: cleanupError.http_code });
        }
      }
      return next(error);
    }

    if (req.file) {
      try {
        await deleteCertificate(previousPublicId, previousMediaType);
      } catch (error) {
        console.error('Unable to remove replaced certificate file:', { name: error.name, statusCode: error.http_code });
      }
    }
    return res.json({ certificate: publicCertificate(current) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:certificateId', requireAdmin, requireTrustedOrigin, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.certificateId)) return res.status(400).json({ message: 'Invalid certificate ID.' });
  try {
    const certificate = await Certificate.findById(req.params.certificateId);
    if (!certificate) return res.status(404).json({ message: 'Certificate not found.' });
    try {
      await deleteCertificate(certificate.publicId, certificate.mediaType);
    } catch (error) {
      if (error.statusCode === 503) return next(new HttpError(503, error.message));
      console.error('Cloudinary certificate deletion failed:', { name: error.name, statusCode: error.http_code });
      return next(new HttpError(502, 'Certificate deletion failed. The published certificate was left unchanged.'));
    }
    await certificate.deleteOne();
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
