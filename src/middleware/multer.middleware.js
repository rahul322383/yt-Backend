// // import multer from 'multer'

// // const storage = multer.diskStorage({

// //     destination: function (req, file, cb) {
// //       cb(null, "./public/temp")
// //     },

// //     filename: function (req, file, cb) {
      
        
// //       cb(null, file.originalname)
// //     }
// //   })

// //   export const upload = multer({ 
// //     storage,
// // })


// import multer from "multer";
// import path from "path";
// import { v4 as uuidv4 } from "uuid"; // ✅ Make sure this is imported correctly

// // Allowed file types
// const allowedFileTypes = ["image/jpeg", "image/png", "image/gif", "video/mp4", "video/mpeg"];

// // Multer storage config
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "./public/temp"); // Temporary local storage
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = `${Date.now()}-${uuidv4()}`; // ✅ Safe usage
//     cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
//   }
// });

// // Filter to allow only valid file types
// const fileFilter = (req, file, cb) => {
//   if (allowedFileTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error("Invalid file type. Only images and videos are allowed."), false);
//   }
// };

// // Final export
// export const upload = multer({
//   storage,
//   limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
//   fileFilter
// });


import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/temp'); // Make sure this folder exists
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only images or videos are allowed"));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter,
});
