import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Notification from "../models/notification.js"; // Adjust path based on your folder structure

// Helper function to create and set JWT token
const generateTokenAndSetCookie = (userId, res) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '15d'
    });
    res.cookie("jwt", token, {
        httpOnly: true, // more secure
        maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
        sameSite: "strict" // CSRF protection
    });
    return token;
};

// Sign up new users
export const signup = async (req, res) => {
    try {
        const { fullname, username, email, password } = req.body;
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }
        
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: "Username is already taken" });
        }
        
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ error: "Email is already taken" });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = new User({
            fullname,
            username,
            email,
            password: hashedPassword
        });
        
        console.log("New User Created (Before Save):", newUser);
        
        await newUser.save();
        
        console.log("New User Saved:", newUser);
        
        generateTokenAndSetCookie(newUser._id, res);
        
        res.status(201).json({
            _id: newUser._id,
            fullname: newUser.fullname,
            username: newUser.username,
            email: newUser.email,
            followers: newUser.followers || [],
            following: newUser.following || [],
            profileImg: newUser.profileImg || "",
            coverImg: newUser.coverImg || "",
        });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Login existing users
export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log("Login attempt with:", req.body);
        
        const user = await User.findOne({ username });
        
        // If user doesn't exist, return error without trying password comparison
        if (!user) {
            return res.status(400).json({ error: "Invalid username" });
        }
        
        // Now we're sure user exists, we can safely compare passwords
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        
        if (!isPasswordCorrect) {
            return res.status(400).json({ error: "Invalid password" });
        }
        
        generateTokenAndSetCookie(user._id, res);
        
        res.status(200).json({
            _id: user._id,
            fullname: user.fullname,
            username: user.username,
            email: user.email,
            followers: user.followers || [],
            following: user.following || [],
            profileImg: user.profileImg || "",
            coverImg: user.coverImg || "",
        });
    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Logout users
export const logout = async (req, res) => {
    try { 
        res.cookie("jwt", "", { maxAge: 0 }); 
        res.status(200).json({ message: "Logged out successfully" }); 
    } catch (error) { 
        console.log("Error in logout controller", error.message); 
        res.status(500).json({ error: "Internal Server Error" }); 
    }
};