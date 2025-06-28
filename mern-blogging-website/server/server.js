import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt'
import 'dotenv/config'
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import { v2 as cloudinary } from 'cloudinary';

//schema
import User from './Schema/User.js'
import Blog from './Schema/Blog.js'
import Notification from './Schema/Notification.js'
import Newsletter from './Schema/Newsletter.js'
import Comment from './Schema/Comment.js'

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = express();
let PORT = process.env.PORT || 3000;
let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password
server.use(cors());
server.use(express.json({ limit: '50mb' }));
server.use(express.urlencoded({ limit: '50mb', extended: true }));
server.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
});

// JWT Configuration
const JWT_AUDIENCE = 'mern-blog-users';
const JWT_ISSUER = 'mern-blog-server';
const JWT_EXPIRES_IN = '1d'; // 1 day expiry

const formatDatatoSend = (user) => {
    const access_token = jwt.sign(
        { id: user._id, admin: user.admin },
        process.env.SECRET_ACCESS_KEY,
        {
            expiresIn: JWT_EXPIRES_IN,
            audience: JWT_AUDIENCE,
            issuer: JWT_ISSUER
        }
    );
    return {
        access_token,
        profile_img: user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname,
        isAdmin: user.admin
    };
};

const verifyJWT = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
        return res.status(401).json({ error: "No access token" })
    }
    try {
        const decoded = jwt.verify(token, process.env.SECRET_ACCESS_KEY, {
            audience: JWT_AUDIENCE,
            issuer: JWT_ISSUER
        });
        // Check user existence for sensitive operations
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: "User does not exist" });
        }
        req.user = decoded.id;
        req.admin = decoded.admin;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Access token expired" });
        }
        return res.status(403).json({ error: "Access token is invalid" });
    }
}

const generateUsername = async (email) => {
    let username = email.split("@")[0];
    let isUsernameNotUnique = await User.exists({ "personal_info.username": username });
    isUsernameNotUnique ? username += nanoid(5) : "";
    return username;
};

server.post("/signup", (req, res) => {
    let { firstname, lastname, email, password } = req.body;
    let fullname = (firstname + ' ' + lastname).trim();

    // validating the data from frontend
    if (!firstname || firstname.length < 1) {
        return res.status(403).json({ "error": "First name must be at least 1 letter long" });
    }
    if (!lastname || lastname.length < 1) {
        return res.status(403).json({ "error": "Last name must be at least 1 letter long" });
    }
    if (fullname.length < 3) {
        return res.status(403).json({ "error": "Fullname must be at least 3 letters long" });
    }
    if (!email.length) {
        return res.status(403).json({ "error": "Enter Email" })
    }
    if (!emailRegex.test(email)) {
        return res.status(403).json({ "error": "Email is invalid" });
    }

    if (!passwordRegex.test(password)) {
        return res.status(403).json({ "error": "Password should be 6 to 20 characters long with a numeric, 1 lowercase and 1 uppercase letter" });
    }
    bcrypt.hash(password, 10, async (err, hashed_password) => {
        let username = await generateUsername(email);

        let user = new User({
            personal_info: { firstname, lastname, fullname, email, password: hashed_password, username }
        });

        user.save().then(async (u) => {
            // Notify all admins about new user registration
            const admins = await User.find({ admin: true });
            for (const admin of admins) {
                await new Notification({
                    type: 'new_user',
                    notification_for: admin._id,
                    for_role: 'admin',
                    user: u._id
                }).save();
            }
            return res.status(200).json(formatDatatoSend(u));
        })
            .catch(err => {
                if (err.code == 11000) {
                    return res.status(500).json({ "error": "Email already exists" })
                }
                return res.status(500).json({ "error": err.message });
            })
    })
})

server.post("/login", async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await User.findOne({ "personal_info.email": email });
        if (!user) {
            return res.status(403).json({ error: "Email not found" });
        }

        const passwordMatch = await bcrypt.compare(password, user.personal_info.password);
        if (!passwordMatch) {
            return res.status(403).json({ error: "Incorrect password" });
        }

        return res.status(200).json(formatDatatoSend(user));
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: "An error occurred during login" });
    }
});

server.post("/get-profile", (req, res) => {
    let { username } = req.body;

    User.findOne({ "personal_info.username": username })
        .select("-personal_info.password -google_auth -updateAt -blogs")
        .then(user => {
            return res.status(200).json(user);
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: err.message });
        });
});

server.post("/update-profile-img", verifyJWT, (req, res) => {
    let { url } = req.body;

    User.findOneAndUpdate({ _id: req.user }, { "personal_info.profile_img": url })
        .then(() => {
            return res.status(200).json({ profile_img: url });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
});

server.post("/update-profile", verifyJWT, (req, res) => {
    let { firstname, lastname, email, username, bio, social_links } = req.body;
    let fullname = (firstname + ' ' + lastname).trim();
    let biolimit = 150;

    if (!firstname || firstname.length < 1) {
        return res.status(403).json({ error: "First name must be at least 1 letter long" });
    }
    if (!lastname || lastname.length < 1) {
        return res.status(403).json({ error: "Last name must be at least 1 letter long" });
    }
    if (!username || username.length < 3) {
        return res.status(403).json({ error: "Username should be at least 3 letters long" });
    }
    if ((bio || '').length > biolimit) {
        return res.status(403).json({ error: `Bio should not be more than ${biolimit} characters` });
    }

    let socialLinksArr = Object.keys(social_links);

    try {
        for (let i = 0; i < socialLinksArr.length; i++) {
            if (social_links[socialLinksArr[i]].length) {
                let hostname = new URL(social_links[socialLinksArr[i]]).hostname;
                if (!hostname.includes(`${socialLinksArr[i]}.com`) && socialLinksArr[i] !== "website") {
                    return res.status(403).json({ error: `${socialLinksArr[i]} link is invalid. You must enter a full ${socialLinksArr[i]} link` });
                }
            }
        }
    } catch (e) {
        return res.status(500).json({ error: "Social links are invalid" });
    }
    let updateObj = {
        "personal_info.firstname": firstname,
        "personal_info.lastname": lastname,
        "personal_info.fullname": fullname,
        "personal_info.email": email,
        "personal_info.username": username,
        "personal_info.bio": bio,
        social_links
    }

    User.findOneAndUpdate({ _id: req.user }, updateObj, {
        runValidators: true
    })
        .then(() => {
            return res.status(200).json({ username, fullname, email, firstname, lastname })
        })
        .catch(err => {
            if (err.code == 11000) {
                if (err.keyPattern.email) {
                    return res.status(500).json({ error: "Email is taken by another user" });
                } else {
                    return res.status(500).json({ error: "Username is taken by another user" });
                }
            }
            return res.status(500).json({ error: err.message });
        });
});

server.post("/change-password", verifyJWT, (req, res) => {
    console.log("Change password request received");
    console.log("User ID:", req.user);
    console.log("Request body:", req.body);

    let { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        console.log("Missing password fields");
        return res.status(400).json({ error: "Current password and new password are required" });
    }

    // Check if new password is same as current password
    if (currentPassword === newPassword) {
        console.log("New password is same as current password");
        return res.status(400).json({ error: "New password must be different from current password" });
    }

    if (!passwordRegex.test(currentPassword) || !passwordRegex.test(newPassword)) {
        console.log("Password validation failed");
        return res.status(403).json({ error: "Password should be 6 to 20 characters long with a numeric, 1 lowercase and 1 uppercase letters" });
    }

    User.findOne({ _id: req.user })
        .then((user) => {
            console.log("User found:", user ? "Yes" : "No");
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            if (user.google_auth) {
                console.log("User is Google authenticated");
                return res.status(403).json({ error: "You can't change account's password because you logged in through google" });
            }

            bcrypt.compare(currentPassword, user.personal_info.password, (err, result) => {
                if (err) {
                    console.log("Bcrypt compare error:", err);
                    return res.status(500).json({ error: "Some error occurred while changing the password, please try again later" });
                }

                console.log("Password match result:", result);
                if (!result) {
                    return res.status(403).json({ error: "Incorrect current password" });
                }

                bcrypt.hash(newPassword, 10, (err, hashed_password) => {
                    if (err) {
                        console.log("Bcrypt hash error:", err);
                        return res.status(500).json({ error: "Some error occurred while hashing the password" });
                    }

                    User.findOneAndUpdate({ _id: req.user }, { "personal_info.password": hashed_password })
                        .then(() => {
                            console.log("Password updated successfully");
                            return res.status(200).json({ status: "password changed", message: "Password updated successfully" });
                        })
                        .catch(err => {
                            console.log("Database update error:", err);
                            return res.status(500).json({ error: "Some error occurred while saving new password, please try again later" });
                        });
                });
            });
        })
        .catch(err => {
            console.log("User find error:", err);
            return res.status(500).json({ error: "Some error occurred while finding the user, please try again later" });
        });
});

function escapeRegex(string) {
    return string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

server.post("/search-blogs-count", (req, res) => {
    let { tag } = req.body;

    // Match the query from search-blogs endpoint
    let findQuery = { draft: false };
    
    if (tag && tag.trim()) {
        findQuery.tags = tag;
    }

    Blog.countDocuments(findQuery)
        .then(count => {
            console.log(`Total blogs count for tag: ${tag} = ${count}`);
            return res.status(200).json({ totalDocs: count });
        })
        .catch(err => {
            console.error("Error in search-blogs-count:", err);
            return res.status(500).json({ error: err.message });
        });
});

server.post("/search-blogs", (req, res) => {
    let { tag, page = 1 } = req.body;

    // Make the query less restrictive - remove the total_reads requirement
    let findQuery = { draft: false };
    
    // Add tag filter only if tag is provided
    if (tag && tag.trim()) {
        findQuery.tags = tag;
    }

    let maxLimit = 5;
    let skipDocs = (page - 1) * maxLimit;

    Blog.find(findQuery)
        .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img")
        .sort({ "publishedAt": -1 })
        .select("title des banner activity publishedAt blog_id tags -_id")
        .skip(skipDocs)
        .limit(maxLimit)
        .then(blogs => {
            console.log(`Found ${blogs.length} blogs for tag: ${tag}, page: ${page}`);
            return res.status(200).json({ blogs });
        })
        .catch(err => {
            console.error("Error in search-blogs:", err);
            return res.status(500).json({ error: err.message });
        });
});

server.post("/all-latest-blogs-count", (req, res) => {
    Blog.countDocuments({ draft: false })
        .then(count => {
            return res.status(200).json({ totalDocs: count });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
});

server.get("/latest-blogs", (req, res) => {
    let maxLimit = 5;

    Blog.find({ draft: false })
        .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img")
        .sort({ "publishedAt": -1 })
        .select("title des banner activity publishedAt blog_id tags -_id")
        .limit(maxLimit)
        .then(blogs => {
            return res.status(200).json({ blogs });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
});

server.post("/user-written-blogs-count", verifyJWT, (req, res) => {
    try {
        let user_id = req.user;
        let { draft, query } = req.body;

        console.log(`Counting ${draft ? 'drafts' : 'published blogs'} for user:`, user_id);
        console.log('Count params:', { draft, query });

        let findQuery = { author: user_id, draft };
        if (query && query.trim()) {
            findQuery.title = new RegExp(query.trim(), "i");
        }

        console.log('Count query:', JSON.stringify(findQuery, null, 2));

        Blog.countDocuments(findQuery)
            .then(count => {
                console.log(`Total ${draft ? 'drafts' : 'published blogs'} count:`, count);
                return res.status(200).json({ totalDocs: count });
            })
            .catch(err => {
                console.error("Error counting blogs:", err);
                return res.status(500).json({ error: "Failed to count blogs" });
            });
    } catch (err) {
        console.error("Error in count endpoint:", err);
        return res.status(500).json({ error: "Failed to count blogs" });
    }
});

server.post("/delete-blog", verifyJWT, async (req, res) => {
    let user_id = req.user;
    let isAdmin = req.admin;
    let { blogId } = req.body;

    if (!isAdmin) {
        return res.status(403).json({ error: "You don't have permissions to delete this blog" });
    }

    try {
        // Find and delete the blog
        const blog = await Blog.findOneAndDelete({ blog_id: blogId });
        if (!blog) {
            return res.status(404).json({ error: "Blog not found" });
        }

        // Delete associated notifications
        await Notification.deleteMany({ blog: blog._id });

        // Delete associated comments
        await Comment.deleteMany({ blog_id: blog._id });

        // Remove blog reference from the author's blogs array and decrement their total_posts
        await User.findOneAndUpdate(
            { _id: blog.author },
            { $pull: { blogs: blog._id }, $inc: { "account_info.total_posts": -1 } }
        );

        // Delete the banner image from Cloudinary if it exists and is a Cloudinary URL
        if (blog.banner && blog.banner.includes("cloudinary.com")) {
            try {
                // Extract public_id from the URL
                const matches = blog.banner.match(/\/([^\/]+)\.(jpg|jpeg|png|gif|webp)$/i);
                if (matches && matches[1]) {
                    const publicId = `blog-profiles/${matches[1]}`;
                    await cloudinary.uploader.destroy(publicId);
                }
            } catch (imgErr) {
                // Log but don't fail the whole operation if image deletion fails
                console.error('Failed to delete banner image from Cloudinary:', imgErr);
            }
        }

        return res.status(200).json({ status: 'done' });
    } catch (err) {
        console.error('Error deleting blog:', err);
        return res.status(500).json({ error: err.message });
    }
});

// Test endpoint to check server and Cloudinary status
server.get("/test-upload", async (req, res) => {
    try {
        console.log("Testing upload service...");
        
        // Check Cloudinary configuration
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            return res.status(500).json({ 
                error: "Cloudinary configuration missing",
                cloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
                apiKey: !!process.env.CLOUDINARY_API_KEY,
                apiSecret: !!process.env.CLOUDINARY_API_SECRET
            });
        }

        // Test Cloudinary connection with a simple API call
        const result = await cloudinary.api.ping();
        
        res.json({ 
            success: true, 
            message: "Upload service is working",
            cloudinary: result,
            config: {
                cloudName: process.env.CLOUDINARY_CLOUD_NAME,
                hasApiKey: !!process.env.CLOUDINARY_API_KEY,
                hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
            }
        });
    } catch (error) {
        console.error("Test upload error:", error);
        res.status(500).json({ 
            error: "Upload service test failed",
            details: error.message
        });
    }
});

// Image upload endpoint using Cloudinary
server.post("/upload-image", verifyJWT, async (req, res) => {
    try {
        console.log("Upload request received");
        const { image } = req.body;

        if (!image) {
            console.log("No image data provided");
            return res.status(400).json({ error: "No image data provided" });
        }

        // Validate base64 header for allowed types
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
        const matches = image.match(/^data:(image\/jpeg|image\/png|image\/jpg);base64,/);
        if (!matches || !allowedTypes.includes(matches[1])) {
            console.log("Invalid image type:", matches ? matches[1] : "no match");
            return res.status(400).json({ error: "Only JPG, JPEG, and PNG files are allowed." });
        }

        // Validate size (max 2MB)
        // Calculate base64 size: (length * 3/4) - padding
        const base64Length = image.split(",")[1]?.length || 0;
        const sizeInBytes = Math.ceil(base64Length * 3 / 4);
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (sizeInBytes > maxSize) {
            console.log("Image too large:", sizeInBytes, "bytes");
            return res.status(400).json({ error: "Image size must be less than 2MB." });
        }

        console.log("Image validation passed, size:", sizeInBytes, "bytes");

        // Check Cloudinary configuration
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            console.error("Cloudinary configuration missing");
            return res.status(500).json({ error: "Image upload service not configured" });
        }

        console.log("Starting Cloudinary upload...");

        // Upload to Cloudinary with timeout
        const uploadPromise = cloudinary.uploader.upload(image, {
            folder: 'blog-profiles',
            width: 500,
            height: 500,
            crop: 'pad',
            background: 'auto',
            quality: 'auto',
            timeout: 60000 // 60 second timeout for Cloudinary
        });

        // Add timeout wrapper
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Upload timeout')), 60000);
        });

        const result = await Promise.race([uploadPromise, timeoutPromise]);

        console.log("Upload successful:", result.secure_url);

        res.json({
            success: true,
            url: result.secure_url
        });
    } catch (error) {
        console.error("Image upload error:", error);
        
        let errorMessage = "Failed to upload image";
        let statusCode = 500;

        if (error.message === 'Upload timeout') {
            errorMessage = "Upload timed out. Please try again.";
            statusCode = 408;
        } else if (error.http_code) {
            // Cloudinary specific error
            switch (error.http_code) {
                case 400:
                    errorMessage = "Invalid image format";
                    statusCode = 400;
                    break;
                case 401:
                    errorMessage = "Cloudinary authentication failed";
                    statusCode = 500;
                    break;
                case 413:
                    errorMessage = "Image file too large";
                    statusCode = 413;
                    break;
                default:
                    errorMessage = `Upload failed: ${error.message}`;
                    statusCode = 500;
            }
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = "Network error. Please check your connection.";
            statusCode = 503;
        } else if (error.code === 'ECONNRESET') {
            errorMessage = "Connection reset. Please try again.";
            statusCode = 503;
        }

        res.status(statusCode).json({ error: errorMessage });
    }
});

// Endpoint to clean up unused banner images from Cloudinary
server.post('/cleanup-unused-banners', verifyJWT, async (req, res) => {
    // Only allow admins
    if (!req.admin) {
        return res.status(403).json({ error: 'Only admins can perform this action.' });
    }
    try {
        // 1. Get all banner URLs from blogs
        const blogs = await Blog.find({}, 'banner');
        const usedUrls = new Set(blogs.map(b => b.banner).filter(Boolean));

        // 2. List all images in the 'blog-profiles' folder on Cloudinary
        let nextCursor = undefined;
        let allCloudinaryImages = [];
        do {
            const result = await cloudinary.api.resources({
                type: 'upload',
                prefix: 'blog-profiles/',
                max_results: 100,
                next_cursor: nextCursor
            });
            allCloudinaryImages = allCloudinaryImages.concat(result.resources);
            nextCursor = result.next_cursor;
        } while (nextCursor);

        // 3. Find images not referenced in any blog
        const unusedImages = allCloudinaryImages.filter(img => {
            // Compare by secure_url
            return !usedUrls.has(img.secure_url);
        });

        // 4. Delete unused images
        let deleted = [];
        for (const img of unusedImages) {
            await cloudinary.uploader.destroy(img.public_id);
            deleted.push(img.secure_url);
        }

        res.json({ success: true, deletedCount: deleted.length, deleted });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: 'Failed to clean up unused images.' });
    }
});

// Get individual blog by blog_id
server.post("/get-blog", async (req, res) => {
    try {
        let { blog_id, draft = false, mode } = req.body;
        let user_id = null;
        let isLikedByUser = false;

        // Check if user is authenticated
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            try {
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.SECRET_ACCESS_KEY, {
                    audience: JWT_AUDIENCE,
                    issuer: JWT_ISSUER
                });
                user_id = decoded.id;
            } catch (err) {
                // Token is invalid, but we can still fetch the blog
                console.log("Invalid token, fetching blog without user context");
            }
        }

        // Build query
        let query = { blog_id };
        if (mode === 'edit') {
            // For editing, allow drafts and published blogs
            query = { blog_id };
        } else {
            // For viewing, only show published blogs unless user is author
            query = { blog_id, draft: false };
        }

        const blog = await Blog.findOne(query)
            .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img");

        if (!blog) {
            return res.status(404).json({ error: "Blog not found" });
        }

        // Check if user has liked this blog
        if (user_id) {
            const user = await User.findById(user_id);
            if (user && user.liked_blogs && user.liked_blogs.includes(blog.blog_id)) {
                isLikedByUser = true;
            }
        }

        // Increment read count for published blogs
        if (!blog.draft && mode !== 'edit') {
            await Blog.findOneAndUpdate(
                { blog_id },
                { $inc: { "activity.total_reads": 1 } }
            );
        }

        return res.status(200).json({ blog, likedByUser: isLikedByUser });
    } catch (err) {
        console.error("Error fetching blog:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Get blog comments
server.post("/get-blog-comments", async (req, res) => {
    try {
        let { blog_id, skip = 0 } = req.body;

        if (!blog_id) {
            return res.status(400).json({ error: "Blog ID is required" });
        }

        // Find the blog first to get its _id
        const blog = await Blog.findOne({ blog_id });
        if (!blog) {
            return res.status(404).json({ error: "Blog not found" });
        }

        // Get comments for this blog
        const comments = await Comment.find({ blog_id: blog._id })
            .populate("commented_by", "personal_info.fullname personal_info.username personal_info.profile_img")
            .sort({ "commentedAt": -1 })
            .skip(skip)
            .limit(10);

        return res.status(200).json({ comments });
    } catch (err) {
        console.error("Error fetching comments:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Create or update blog
server.post("/create-blog", verifyJWT, async (req, res) => {
    try {
        let { title, des, banner, content, tags, draft, id } = req.body;
        let user_id = req.user;

        // Validate required fields for published blogs
        if (!draft) {
            if (!title || !title.trim()) {
                return res.status(400).json({ error: "Title is required for published blogs" });
            }
            if (!des || !des.trim()) {
                return res.status(400).json({ error: "Description is required for published blogs" });
            }
            if (!banner || !banner.trim()) {
                return res.status(400).json({ error: "Banner image is required for published blogs" });
            }
            if (!content) {
                return res.status(400).json({ error: "Content is required for published blogs" });
            }
            if (!tags || !Array.isArray(tags) || tags.length === 0) {
                return res.status(400).json({ error: "At least one tag is required for published blogs" });
            }
        } else {
            // For drafts, provide sensible defaults
            if (!title || !title.trim()) {
                title = "Untitled Draft";
            }
            if (!des || !des.trim()) {
                des = "";
            }
            if (!banner || !banner.trim()) {
                banner = "";
            }
            if (!content) {
                content = [{ time: Date.now(), blocks: [], version: '2.27.2' }];
            }
            if (!tags || !Array.isArray(tags)) {
                tags = [];
            }
        }

        // Ensure content is properly structured
        if (content) {
            // Handle case where content is sent as a single object instead of array
            if (!Array.isArray(content)) {
                content = [content];
            }
            
            // Ensure each content item has the required structure
            content = content.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return {
                        time: item.time || Date.now(),
                        blocks: Array.isArray(item.blocks) ? item.blocks : [],
                        version: item.version || '2.27.2'
                    };
                }
                return { time: Date.now(), blocks: [], version: '2.27.2' };
            });
        } else {
            content = [{ time: Date.now(), blocks: [], version: '2.27.2' }];
        }

        // Additional validation for published blogs
        if (!draft) {
            // Check if content has actual blocks
            const hasContent = content.some(item => 
                Array.isArray(item.blocks) && item.blocks.length > 0
            );
            if (!hasContent) {
                return res.status(400).json({ error: "Blog content cannot be empty" });
            }
        }

        // Filter out empty tags
        if (Array.isArray(tags)) {
            tags = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
        } else {
            tags = [];
        }

        let blog;
        if (id) {
            // Update existing blog
            blog = await Blog.findOne({ blog_id: id, author: user_id });
            if (!blog) {
                return res.status(404).json({ error: "Blog not found or you don't have permission to edit it" });
            }

            // Update blog fields
            blog.title = title || blog.title;
            blog.des = des || blog.des;
            blog.banner = banner || blog.banner;
            blog.content = content || blog.content;
            blog.tags = tags || blog.tags;
            blog.draft = draft !== undefined ? draft : blog.draft;

            await blog.save();
        } else {
            // Create new blog
            console.log('Creating new blog with data:', { title, des, banner, content: content.length, tags: tags.length, draft, author: user_id });
            
            blog = new Blog({
                title,
                des,
                banner,
                content,
                tags,
                draft: draft !== undefined ? draft : true,
                author: user_id
            });

            console.log('Blog object created, about to save...');
            await blog.save();
            console.log('Blog saved successfully with blog_id:', blog.blog_id);

            // Add blog to user's blogs array and increment total_posts
            await User.findOneAndUpdate(
                { _id: user_id },
                { $push: { blogs: blog._id }, $inc: { "account_info.total_posts": 1 } }
            );
        }

        return res.status(200).json({ blog_id: blog.blog_id });
    } catch (err) {
        console.error("Error creating/updating blog:", err);
        if (err.code === 11000) {
            return res.status(400).json({ error: "Blog ID already exists. Please try again." });
        }
        if (err.name === 'ValidationError') {
            const validationErrors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ error: validationErrors.join(', ') });
        }
        if (err.name === 'CastError') {
            return res.status(400).json({ error: "Invalid data format provided" });
        }
        return res.status(500).json({ error: "Failed to save blog. Please try again." });
    }
});

// Update existing blog
server.put("/update-blog/:blogId", verifyJWT, async (req, res) => {
    try {
        let { title, des, banner, content, tags, draft } = req.body;
        let user_id = req.user;
        let { blogId } = req.params;

        // Find the blog and verify ownership
        const blog = await Blog.findOne({ blog_id: blogId, author: user_id });
        if (!blog) {
            return res.status(404).json({ error: "Blog not found or you don't have permission to edit it" });
        }

        // Validate required fields for published blogs
        if (!draft) {
            if (!title || !title.trim()) {
                return res.status(400).json({ error: "Title is required for published blogs" });
            }
            if (!des || !des.trim()) {
                return res.status(400).json({ error: "Description is required for published blogs" });
            }
            if (!banner || !banner.trim()) {
                return res.status(400).json({ error: "Banner image is required for published blogs" });
            }
            if (!content) {
                return res.status(400).json({ error: "Content is required for published blogs" });
            }
            if (!tags || !Array.isArray(tags) || tags.length === 0) {
                return res.status(400).json({ error: "At least one tag is required for published blogs" });
            }
        } else {
            // For drafts, provide sensible defaults
            if (!title || !title.trim()) {
                title = "Untitled Draft";
            }
            if (!des || !des.trim()) {
                des = "";
            }
            if (!banner || !banner.trim()) {
                banner = "";
            }
            if (!content) {
                content = [{ time: Date.now(), blocks: [], version: '2.27.2' }];
            }
            if (!tags || !Array.isArray(tags)) {
                tags = [];
            }
        }

        // Ensure content is properly structured
        if (content) {
            // Handle case where content is sent as a single object instead of array
            if (!Array.isArray(content)) {
                content = [content];
            }
            
            // Ensure each content item has the required structure
            content = content.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return {
                        time: item.time || Date.now(),
                        blocks: Array.isArray(item.blocks) ? item.blocks : [],
                        version: item.version || '2.27.2'
                    };
                }
                return { time: Date.now(), blocks: [], version: '2.27.2' };
            });
        } else {
            content = [{ time: Date.now(), blocks: [], version: '2.27.2' }];
        }

        // Additional validation for published blogs
        if (!draft) {
            // Check if content has actual blocks
            const hasContent = content.some(item => 
                Array.isArray(item.blocks) && item.blocks.length > 0
            );
            if (!hasContent) {
                return res.status(400).json({ error: "Blog content cannot be empty" });
            }
        }

        // Filter out empty tags
        if (Array.isArray(tags)) {
            tags = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
        } else {
            tags = [];
        }

        // Update blog fields
        blog.title = title || blog.title;
        blog.des = des || blog.des;
        blog.banner = banner || blog.banner;
        blog.content = content || blog.content;
        blog.tags = tags || blog.tags;
        blog.draft = draft !== undefined ? draft : blog.draft;

        await blog.save();

        return res.status(200).json({ blog_id: blog.blog_id });
    } catch (err) {
        console.error("Error updating blog:", err);
        if (err.code === 11000) {
            return res.status(400).json({ error: "Blog ID already exists. Please try again." });
        }
        if (err.name === 'ValidationError') {
            const validationErrors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ error: validationErrors.join(', ') });
        }
        if (err.name === 'CastError') {
            return res.status(400).json({ error: "Invalid data format provided" });
        }
        return res.status(500).json({ error: "Failed to update blog. Please try again." });
    }
});

// Get user's written blogs
server.post("/user-written-blogs", verifyJWT, async (req, res) => {
    try {
        let user_id = req.user;
        let { page = 1, draft = false, query = "", deleteDocCount = 0 } = req.body;

        console.log(`Fetching ${draft ? 'drafts' : 'published blogs'} for user:`, user_id);
        console.log('Request params:', { page, draft, query, deleteDocCount });

        let maxLimit = 5;
        let skipDocs = (page - 1) * maxLimit - deleteDocCount;

        let findQuery = { author: user_id, draft };
        if (query && query.trim()) {
            findQuery.title = new RegExp(query.trim(), "i");
        }

        console.log('MongoDB find query:', JSON.stringify(findQuery, null, 2));

        const blogs = await Blog.find(findQuery)
            .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img")
            .sort({ "publishedAt": -1 })
            .select("title des banner activity publishedAt blog_id tags draft -_id")
            .skip(skipDocs)
            .limit(maxLimit);

        console.log(`Found ${blogs.length} ${draft ? 'drafts' : 'published blogs'}`);
        
        // Log first few blogs for debugging
        if (blogs.length > 0) {
            console.log('Sample blog data:', {
                blog_id: blogs[0].blog_id,
                title: blogs[0].title,
                draft: blogs[0].draft,
                author: blogs[0].author?.personal_info?.username
            });
        }

        return res.status(200).json({ blogs });
    } catch (err) {
        console.error("Error fetching user blogs:", err);
        console.error("Error details:", {
            name: err.name,
            message: err.message,
            stack: err.stack
        });
        
        let errorMessage = "Failed to fetch blogs";
        if (err.name === 'CastError') {
            errorMessage = "Invalid user ID format";
        } else if (err.name === 'ValidationError') {
            errorMessage = "Invalid query parameters";
        }
        
        return res.status(500).json({ error: errorMessage });
    }
});

// Get trending blogs
server.get("/trending-blogs", async (req, res) => {
    try {
        let maxLimit = 10;

        const blogs = await Blog.find({ draft: false })
            .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img")
            .sort({ "activity.total_reads": -1, "activity.total_likes": -1 })
            .select("title des banner activity publishedAt blog_id tags -_id")
            .limit(maxLimit);

        return res.status(200).json({ blogs });
    } catch (err) {
        console.error("Error fetching trending blogs:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Like/Unlike blog
server.post("/like-blog", verifyJWT, async (req, res) => {
    try {
        let user_id = req.user;
        let { blog_id } = req.body;

        const blog = await Blog.findOne({ blog_id });
        if (!blog) {
            return res.status(404).json({ error: "Blog not found" });
        }

        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const isLiked = user.liked_blogs && user.liked_blogs.includes(blog_id);

        if (isLiked) {
            // Unlike
            await User.findByIdAndUpdate(user_id, {
                $pull: { liked_blogs: blog_id }
            });
            await Blog.findOneAndUpdate(
                { blog_id },
                { $inc: { "activity.total_likes": -1 } }
            );
        } else {
            // Like
            await User.findByIdAndUpdate(user_id, {
                $addToSet: { liked_blogs: blog_id }
            });
            await Blog.findOneAndUpdate(
                { blog_id },
                { $inc: { "activity.total_likes": 1 } }
            );
        }

        return res.status(200).json({ liked: !isLiked });
    } catch (err) {
        console.error("Error liking/unliking blog:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Bookmark/Unbookmark blog
server.post("/bookmark-blog", verifyJWT, async (req, res) => {
    try {
        let user_id = req.user;
        let { blog_id } = req.body;

        await User.findByIdAndUpdate(user_id, {
            $addToSet: { bookmarked_blogs: blog_id }
        });

        return res.status(200).json({ bookmarked: true });
    } catch (err) {
        console.error("Error bookmarking blog:", err);
        return res.status(500).json({ error: err.message });
    }
});

server.post("/unbookmark-blog", verifyJWT, async (req, res) => {
    try {
        let user_id = req.user;
        let { blog_id } = req.body;

        await User.findByIdAndUpdate(user_id, {
            $pull: { bookmarked_blogs: blog_id }
        });

        return res.status(200).json({ bookmarked: false });
    } catch (err) {
        console.error("Error unbookmarking blog:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Add comment to blog
server.post("/add-comment", verifyJWT, async (req, res) => {
    try {
        let user_id = req.user;
        let { blog_id, comment, blog_author, replying_to } = req.body;

        const blog = await Blog.findOne({ blog_id });
        if (!blog) {
            return res.status(404).json({ error: "Blog not found" });
        }

        const newComment = new Comment({
            blog_id: blog._id,
            blog_author,
            commented_by: user_id,
            comment,
            replying_to
        });

        await newComment.save();

        // Increment comment count
        await Blog.findOneAndUpdate(
            { blog_id },
            { $inc: { "activity.total_comments": 1 } }
        );

        // Populate user info for response
        await newComment.populate("commented_by", "personal_info.fullname personal_info.username personal_info.profile_img");

        return res.status(200).json({ comment: newComment });
    } catch (err) {
        console.error("Error adding comment:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Debug endpoint to test draft loading
server.get("/debug/drafts", verifyJWT, async (req, res) => {
    try {
        let user_id = req.user;
        console.log('Debug: User ID from token:', user_id);

        // Check if user exists
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        console.log('Debug: User found:', {
            id: user._id,
            username: user.personal_info?.username,
            email: user.personal_info?.email
        });

        // Get all blogs for this user
        const allBlogs = await Blog.find({ author: user_id });
        console.log('Debug: Total blogs found:', allBlogs.length);

        // Get drafts specifically
        const drafts = await Blog.find({ author: user_id, draft: true });
        console.log('Debug: Drafts found:', drafts.length);

        // Get published blogs
        const published = await Blog.find({ author: user_id, draft: false });
        console.log('Debug: Published blogs found:', published.length);

        return res.status(200).json({
            user: {
                id: user._id,
                username: user.personal_info?.username,
                email: user.personal_info?.email
            },
            stats: {
                totalBlogs: allBlogs.length,
                drafts: drafts.length,
                published: published.length
            },
            drafts: drafts.map(draft => ({
                blog_id: draft.blog_id,
                title: draft.title,
                draft: draft.draft,
                created_at: draft.created_at
            })),
            published: published.map(blog => ({
                blog_id: blog.blog_id,
                title: blog.title,
                draft: blog.draft,
                publishedAt: blog.publishedAt
            }))
        });
    } catch (err) {
        console.error("Debug endpoint error:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Get new notification status
server.get("/new-notification", verifyJWT, async (req, res) => {
    try {
        let user_id = req.user;
        
        // Check if user has any unread notifications
        const unreadCount = await Notification.countDocuments({ 
            notified_of: user_id, 
            seen: false 
        });
        
        return res.status(200).json({ 
            new_notification_available: unreadCount > 0 
        });
    } catch (err) {
        console.error("Error checking notifications:", err);
        return res.status(500).json({ error: "Failed to check notifications" });
    }
});

server.listen(PORT, () => {
    console.log("listening on port " + PORT);
});
