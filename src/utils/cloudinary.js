// import { v2 as cloudinary } from 'cloudinary';
// import fs from 'fs';

// // Cloudinary config (ensure .env is loaded beforehand)
// cloudinary.config({ 
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
//   api_key: process.env.CLOUDINARY_API_KEY, 
//   api_secret: process.env.CLOUDINARY_API_SECRET
// });

// const uploadOnCloudinary = async (localFilePath) => {
//   try {
//     if (!localFilePath) return null;

//     // Upload to Cloudinary
//     const response = await cloudinary.uploader.upload(localFilePath, {
//       resource_type: 'auto', // handles images and videos
//     });

//     console.log("✅ File uploaded successfully:", response.secure_url);

//     // Clean up local file if it exists
//     if (fs.existsSync(localFilePath)) {
//       fs.unlinkSync(localFilePath);
//     }

//     return {
//       url: response.secure_url,
//       public_id: response.public_id,
//       resource_type: response.resource_type,
//     };

//   } catch (error) {
//     console.error("❌ Cloudinary Upload Error:", error);

//     // Clean up local file on failure too
//     if (fs.existsSync(localFilePath)) {
//       fs.unlinkSync(localFilePath);
//     }

//     return null;
//   }
// };

// export { uploadOnCloudinary };


// import { v2 as cloudinary } from 'cloudinary';
// import fs from 'fs';

// // Configure Cloudinary
// cloudinary.config({ 
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
//   api_key: process.env.CLOUDINARY_API_KEY, 
//   api_secret: process.env.CLOUDINARY_API_SECRET
// });

// // Upload function
// const uploadOnCloudinary = async (localFilePath) => {
//   try {
//     if (!localFilePath) return null;

//     // Upload to Cloudinary
//     const response = await cloudinary.uploader.upload(localFilePath, {
//       resource_type: 'auto', // Supports image, video, etc.
//     });

//     console.log("✅ File uploaded successfully:", response.secure_url);

//     // Remove local file
//     fs.unlinkSync(localFilePath);

//     return {
//       url: response.secure_url,
//       public_id: response.public_id,
//       resource_type: response.resource_type,
//     };

//   } catch (error) {
//     console.error("❌ Upload Error:", error);

//     // Remove local file if exists
//     if (fs.existsSync(localFilePath)) {
//       fs.unlinkSync(localFilePath);
//     }

//     return null;
//   }
// };

// export { uploadOnCloudinary };

// const detectResourceType = (ext = '') => {
//   const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
//   const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
//   const rawExts = ['.pdf', '.docx', '.zip', '.txt'];

//   if (imageExts.includes(ext.toLowerCase())) return 'image';
//   if (videoExts.includes(ext.toLowerCase())) return 'video';
//   if (rawExts.includes(ext.toLowerCase())) return 'raw';
//   return 'auto';
// };

// /**
//  * Uploads file to Cloudinary using signed upload
//  * @param {string} localFilePath
//  * @param {object} options
//  * @param {string} [options.folder="uploads"]
//  * @returns {Promise<{url: string, public_id: string, resource_type: string} | null>}
//  */
// export const uploadOnCloudinary = async (
//   localFilePath,
//   { folder = 'uploads' } = {}
// ) => {
//   try {
//     if (!localFilePath || !fs.existsSync(localFilePath)) {
//       console.warn("⚠️ No file found at path:", localFilePath);
//       return null;
//     }

//     const ext = path.extname(localFilePath);
//     const resource_type = detectResourceType(ext);

//     const timestamp = Math.floor(Date.now() / 1000);
//     const public_id = `file_${timestamp}`;
//     const signatureString = `folder=${folder}&public_id=${public_id}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
//     const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

//     const formData = new FormData();
//     formData.append('file', fs.createReadStream(localFilePath));
//     formData.append('folder', folder);
//     formData.append('timestamp', timestamp);
//     formData.append('public_id', public_id);
//     formData.append('api_key', process.env.CLOUDINARY_API_KEY);
//     formData.append('signature', signature);

//     const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
//     const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resource_type}/upload`;

//     const response = await axios.post(cloudinaryUrl, formData, {
//       headers: formData.getHeaders(),
//     });

//     fs.unlinkSync(localFilePath);
//     console.log("✅ Uploaded:", response.data.secure_url);
//     console.log("🧹 Local file deleted:", localFilePath);

//     return {
//       url: response.data.secure_url,
//       public_id: response.data.public_id,
//       resource_type: response.data.resource_type,
//     };
//   } catch (error) {
//     console.error("❌ Cloudinary Upload Error:", error?.response?.data || error.message);

//     if (localFilePath && fs.existsSync(localFilePath)) {
//       fs.unlinkSync(localFilePath);
//       console.log("🧹 Temp file deleted after failure:", localFilePath);
//     }

//     return null;
//   }
// };



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

    console.log('✅ File uploaded successfully:', result.secure_url);

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
