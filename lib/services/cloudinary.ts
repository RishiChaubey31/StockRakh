import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error('Cloudinary credentials are missing in .env');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(buffer: Buffer, folder: string = 'inventory'): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `stockrakh/${folder}`,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result?.secure_url) {
          resolve(result.secure_url);
        } else {
          reject(new Error('Upload failed: No URL returned'));
        }
      }
    );

    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);
  });
}

export async function uploadMultipleImages(
  buffers: Buffer[],
  folder: string = 'inventory'
): Promise<string[]> {
  const uploadPromises = buffers.map((buffer) => uploadImage(buffer, folder));
  return Promise.all(uploadPromises);
}

export default cloudinary;
