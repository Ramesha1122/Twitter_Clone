import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import { 
    followUnfollowUser, 
    getUserProfile, 
    getSuggestUsers, 
    updateUser 
} from '../controllers/user.controller.js'; // Ensure the import path is correct

const userRoutes = express.Router(); // Define the Express Router

// Define routes
userRoutes.get("/profile/:username", protectRoute, getUserProfile);
userRoutes.get("/suggested", protectRoute, getSuggestUsers);
userRoutes.post("/follow/:id", protectRoute, followUnfollowUser);
userRoutes.post("/update", protectRoute, updateUser);

export default userRoutes; // Export the router
