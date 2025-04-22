import cloudinary from '../utils/cloudinary.config.js'; // adjust path if needed
import fs from 'fs';

/**
 * Uploads file from disk to Cloudinary and deletes the local file
 * @param {string} localFilePath - Path to the local file
 * @returns {Promise<{url: string, public_id: string} | null>}
 */
export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath || !fs.existsSync(localFilePath)) return null;

    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
    });

    fs.unlinkSync(localFilePath); // Cleanup local file
    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error('❌ Cloudinary Upload Error:', error.message || error);

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath); // Ensure local file is cleaned up
    }

    return null;
  }
};
