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

/**
 * Extract public_id from a Cloudinary URL
 * URL format: https://res.cloudinary.com/{cloud}/image/upload/{version}/{public_id}.{ext}
 * or: https://res.cloudinary.com/{cloud}/image/upload/{public_id}.{ext}
 */
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    // Match the pattern after /upload/ and before the file extension
    const regex = /\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting public_id from URL:', url, error);
    return null;
  }
}

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

/**
 * Delete a single image from Cloudinary by its public_id
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`Cloudinary delete result for ${publicId}:`, result);
    return result.result === 'ok';
  } catch (error) {
    console.error(`Error deleting image ${publicId} from Cloudinary:`, error);
    return false;
  }
}

/**
 * Delete a single image from Cloudinary by its URL
 */
export async function deleteImageByUrl(url: string): Promise<boolean> {
  const publicId = extractPublicIdFromUrl(url);
  if (!publicId) {
    console.error('Could not extract public_id from URL:', url);
    return false;
  }
  return deleteImage(publicId);
}

/**
 * Delete multiple images from Cloudinary by their URLs
 * Returns an object with success count and failed URLs
 */
export async function deleteMultipleImagesByUrls(urls: string[]): Promise<{
  successCount: number;
  failedUrls: string[];
}> {
  const results = await Promise.all(
    urls.map(async (url) => {
      const success = await deleteImageByUrl(url);
      return { url, success };
    })
  );

  const failedUrls = results.filter((r) => !r.success).map((r) => r.url);
  const successCount = results.filter((r) => r.success).length;

  console.log(`Cloudinary batch delete: ${successCount}/${urls.length} successful`);
  if (failedUrls.length > 0) {
    console.warn('Failed to delete images:', failedUrls);
  }

  return { successCount, failedUrls };
}

/**
 * Delete multiple images from Cloudinary by their public_ids using bulk delete
 * More efficient than individual deletes for large batches
 */
export async function deleteMultipleImages(publicIds: string[]): Promise<{
  successCount: number;
  failedIds: string[];
}> {
  if (publicIds.length === 0) {
    return { successCount: 0, failedIds: [] };
  }

  try {
    // Cloudinary's delete_resources can delete up to 100 images at once
    const result = await cloudinary.api.delete_resources(publicIds);
    console.log('Cloudinary bulk delete result:', result);

    const failedIds: string[] = [];
    let successCount = 0;

    for (const [id, status] of Object.entries(result.deleted || {})) {
      if (status === 'deleted') {
        successCount++;
      } else {
        failedIds.push(id);
      }
    }

    return { successCount, failedIds };
  } catch (error) {
    console.error('Error in bulk delete from Cloudinary:', error);
    return { successCount: 0, failedIds: publicIds };
  }
}

export default cloudinary;
