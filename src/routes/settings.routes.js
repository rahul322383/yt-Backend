import express from 'express';
import {
  updateSettings,
  getSettings,
  deleteSettings,
  getAllSettings,
} from '../controllers/settingsController.js';
import { verifyJWT } from '../middleware/auth.middleware.js';


const router = express.Router();

// router.use(verifyJWT); // Apply JWT verification middleware to all routes in this router


router.get('/', getAllSettings); // GET all settings
router.get('/:category', getSettings); // GET single category
router.put('/:category', updateSettings); // UPDATE single category
router.delete('/:category', deleteSettings); // DELETE single category

export default router;
  