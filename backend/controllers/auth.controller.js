import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';

export const signup = async (req, res) => {
   try{
    const{fullname,username,email,password}= req.body;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if(!emailRegex.test(email)){
        return res.status(400).json({error:"Invalid email format"});

    } 
    const existingUser = await User.findOne({username});
    if(existingUser){
        return res.status(400).jdon({error:"Username is already taken"});

    }
    const existingEmail= await User.findOne({email});
    if(existingUser){
        return res.status(400).jdon({error:"Email is  already taken"});

    }
    //hash pasword

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password,salt);

    const newUser = new User({
        fullName,
        username,
        email,
        password:hashedPassword
    })
    if(newUser){
        generateTokenAndSetCookie(newUser._id,res)
        await newUser.save();
        res.status(201).json({

        })
    }else{

    }
 
}catch(error){ 

   }
};

export const login = async (req, res) => {
    res.json({ data: "You hit the login endpoint" });
};

export const logout = async (req, res) => {
    res.json({ data: "You hit the logout endpoint" });
};