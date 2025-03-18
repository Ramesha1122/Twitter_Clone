import User from '../models/user.model.js';
import Post from '../models/post.model.js';
import Notification from '../models/notification.js';
import {v2 as cloudinary } from 'cloudinary';

export const createPost = async(req,res)=>{
    try {
        const {text} = req.body;
        let {img} = req.body;
        const userId = req.user._id.toString();

        const user = await User.findById(userId)
        if(!user) return res.status(404).json({message:"User not found"})
        
        if(!text && !img){
            const uploadedResponese = await cloudinary.uploader.upload(img)
            img = uploadedResponese.secure_url;
        }

        const newPost = new Post({
            user:userId,
            text,
            img,
        })
        await newPost.save();
        res.status(201).json(newPost);


            
    } catch (error) {
        res.status(500).json({error:"Internal server error"});
        console.log("Error in createPost controller:",error);
        
    }
}

export const deletePost = async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
  
      if (post.user.toString() !== req.user._id.toString()) {
        return res.status(401).json({ error: "You are not authorized to delete this post" });
      }
  
      if (post.img) {
        const imgID = post.img.split("/").pop().split(".")[0]; // Fix typo (consistent casing)
        await cloudinary.uploader.destroy(imgID); // Use correct variable name
      }
  
      await Post.findByIdAndDelete(req.params.id);
  
      res.status(200).json({ message: "Post deleted successfully" });
  
    } catch (error) {
      console.log("Error in deletePost controller:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
export const commentOnPost = async (req, res) => {
    try {
      const { text } = req.body;
      const postId = req.params.id;
      const userId = req.user._id;
  
      // Ensure text is not empty, null, or undefined
      if (!text) {
        return res.status(400).json({ error: "Text field is required" });
      }
  
      const post = await Post.findById(postId);
    
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
  
      // Create the comment object with the correct order: text first, then user
      const comment = {  user: userId,text };
  
      // Add the comment to the post
      post.comments.push(comment);
      
      // Save with validation
      await post.save();
  
      res.status(200).json(post);
    } catch (error) {
      console.log("Error in commentOnPost controller: ", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

export const likeUnlikePost = async (req, res) => {
    try {
      const userId = req.user._id;
      const { id: postId } = req.params;
  
      const post = await Post.findById(postId);
  
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      // Fixed typo: lekes -> likes
      const userLikePost = post.likes.includes(userId);
  
      if (userLikePost) {
        // Unlike post
        // This is incorrect: await Post.updateOne({_id:postId},{likes:userId})
        // Should be removing the userId from likes array
        await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
        await User.updateOne({ _id: userId }, { $pull: { likes: postId } });
        res.status(200).json({ message: "Post unliked successfully" });
      } else {
        // Like post
        post.likes.push(userId);
        await User.updateOne({_id:userId},{$push:{likedPosts:postId}})
        await post.save();
  
        const notification = new Notification({
          from: userId,
          to: post.user,
          type: "like",
        });
        await notification.save();
        
        // You're missing a response here
        res.status(200).json({ message: "Post liked successfully" });
      }
    } catch (error) {
      console.log("Error in likeUnlikePost controller:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

export const getAllPosts = async (_req, res) => {
    try {
      const posts = await Post.find()
        .sort({ createdAt: -1 }) // Corrected field name
        .populate({
          path: "user",
          select: "-password", // Use minus to EXCLUDE password (not select only password)
         })
         .populate({
          path: "comments.user",  // Ensure this path matches your schema
          select: "-password"      // Exclude the password field
      })

  
      // This is fine, but redundant since an empty array will be returned anyway
      if (posts.length === 0) {
        return res.status(200).json([]);
      }
  
      res.status(200).json(posts);
    } catch (error) {
      console.log("Error in getAllPosts controller:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  export const getLikedPosts = async(req, res) => {
    // The issue is here - req.params.id not req.params._id
    const userId = req.params.id;
    
    try {
      const user = await User.findById(userId);
      if(!user) return res.status(404).json({error: "User not found"});
      
      // Make sure your User model actually has a likedPosts field
      // If user.likedPosts doesn't exist, this will cause an error
      const likedPosts = await Post.find({_id: {$in: user.likedPosts}})
      .populate({
        path: "user",
        select: "-password"
      })
      .populate({
        path: "comments.user",
        select: "-password"
      });
      
      res.status(200).json(likedPosts);
    } catch (error) {
      console.log("Error in getLikedPosts controller:", error);
      res.status(500).json({error: "Internal server error"});
    }
};

export const getFollowingPosts = async (req, res) => {
  try {
    // Verify req.user exists
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const userId = req.user._id;
    console.log(`Getting following posts for user: ${userId}`);
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const following = user.following || [];
    console.log(`User is following ${following.length} accounts`);
    
    if (following.length === 0) {
      return res.status(200).json([]); // Return empty array if not following anyone
    }

    const feedPosts = await Post.find({ user: { $in: following } })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    console.log(`Found ${feedPosts.length} posts from followed users`);
    res.status(200).json(feedPosts);
  } catch (error) {
    console.log("Error in getFollowingPosts controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getUserPosts = async (req, res) => {
	try {
		const { username } = req.params;

		const user = await User.findOne({ username });
		if (!user) return res.status(404).json({ error: "User not found" });

		const posts = await Post.find({ user: user._id })
			.sort({ createdAt: -1 })
			.populate({
				path: "user",
				select: "-password",
			})
			.populate({
				path: "comments.user",
				select: "-password",
			});

		res.status(200).json(posts);
	} catch (error) {
		console.log("Error in getUserPosts controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};