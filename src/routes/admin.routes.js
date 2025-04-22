import express from "express";
import  admin  from "../middleware/admin.middleware.js";
import {verifyJWT} from "../middleware/auth.middleware.js";
import {
    getAllUsers,
    exportUsersCSV,
    getUserById,
    updateUserByAdmin,
    deleteUserByAdmin,
    toggleUserActiveStatus
  } from "../controllers/admin.controllers.js";
  

const router = express.Router();
router.use(verifyJWT , admin);

router.get('', admin, getAllUsers);
router.get('/users/export/csv', admin, exportUsersCSV);
router.get('/users/:userId', admin, getUserById);
router.put('/users/:userId', admin, updateUserByAdmin);
router.delete('/users/:userId', admin, deleteUserByAdmin);
router.patch('/users/:userId/toggle-active', admin, toggleUserActiveStatus);


export default router;