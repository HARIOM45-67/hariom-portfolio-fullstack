import { v2 as cloudinary } from 'cloudinary';

function configureCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return false;
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });
  return true;
}

export async function uploadResume(buffer, publicId) {
  if (!configureCloudinary()) {
    const error = new Error('Cloudinary resume storage is not configured.');
    error.statusCode = 503;
    throw error;
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({
      resource_type: 'raw',
      type: 'upload',
      public_id: publicId,
      overwrite: false,
      filename_override: 'resume.pdf',
      use_filename: false
    }, (error, result) => {
      if (error) return reject(error);
      if (!result?.secure_url) return reject(new Error('Cloudinary did not return a secure file URL.'));
      return resolve(result);
    }).end(buffer);
  });
}

export async function deleteResume(publicId) {
  if (!configureCloudinary()) {
    const error = new Error('Cloudinary resume storage is not configured.');
    error.statusCode = 503;
    throw error;
  }
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', type: 'upload' });
  if (!['ok', 'not found'].includes(result.result)) {
    throw new Error('Cloudinary did not confirm resume deletion.');
  }
  return result;
}
