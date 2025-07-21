// import express from 'express';
// import {
//   updateSettings,
//   getSettings,
//   deleteSettings,
//   getAllSettings,
// } from '../controllers/settingsController.js';
// import { verifyJWT } from '../middleware/auth.middleware.js';


// const router = express.Router();

// router.use(verifyJWT); // Apply JWT verification middleware to all routes in this router


// router.get('/', verifyJWT,getAllSettings); // GET all settings
// router.get('/:category',verifyJWT ,getSettings); // GET single category
// router.put('/:category', updateSettings); // UPDATE single category
// router.delete('/:category', deleteSettings); // DELETE single category

// export default router;
  


import express from 'express';
import {
  updateSettings,
  getUserSettings,
  // getUserSettings,
  updateAccount,
  exportUserData,
  deleteAccount
} from '../controllers/settingsController.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply JWT verification middleware to all routes in this router
router.use(verifyJWT);

// GET all settings

router.get('/settings', verifyJWT, getUserSettings);
router.put('/account', verifyJWT, updateAccount);
router.put('/settings', verifyJWT, updateSettings);
router.get('/export', verifyJWT, exportUserData);
router.delete('/account', verifyJWT ,deleteAccount);

export default router;