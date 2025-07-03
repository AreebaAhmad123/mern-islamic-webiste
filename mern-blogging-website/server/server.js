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
import { OAuth2Client } from 'google-auth-library';

//schema
import User from './Schema/User.js'
import Blog from './Schema/Blog.js'
import Notification from './Schema/Notification.js'
import Newsletter from './Schema/Newsletter.js'
import Comment from './Schema/Comment.js'
import Contact from './Schema/Contact.js'

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

// Allow CORS from Netlify frontend
server.use(cors({
  origin: 'https://prismatic-starship-137fe3.netlify.app',
  credentials: true
}));

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
        isAdmin: user.admin,
        bookmarked_blogs: user.bookmarked_blogs || [],
        liked_blogs: user.liked_blogs || []
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

server.post("/api/signup", async (req, res) => {
    try {
        const { firstname, lastname, email, password } = req.body;
        const fullname = (firstname + ' ' + lastname).trim();

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

        // Check if user already exists
        let user = await User.findOne({ "personal_info.email": email });
        if (user && user.verified) {
            return res.status(400).json({ error: "Email already exists and is verified" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const username = await generateUsername(email);
        const verificationToken = nanoid(32);

        if (!user) {
            // Create new user as unverified
            user = new User({
                personal_info: {
                    firstname,
                    lastname,
                    fullname,
                    email,
                    password: hashedPassword,
                    username
                },
                verified: false,
                verificationToken
            });
        } else {
            // Update existing unverified user
            user.personal_info.firstname = firstname;
            user.personal_info.lastname = lastname;
            user.personal_info.fullname = fullname;
            user.personal_info.password = hashedPassword;
            user.personal_info.username = username;
            user.verificationToken = verificationToken;
        }
        // Save user
        try {
            await user.save();
            console.log('User saved:', user.personal_info.email);
        } catch (saveErr) {
            console.error('Error saving user:', saveErr);
            return res.status(500).json({ error: 'Failed to save user. Please try again.' });
        }

        // Send verification email
        try {
            await transporter.sendMail({
                from: `Islamic Stories <${process.env.ADMIN_EMAIL}>`,
                to: email,
                subject: 'Verify your email address',
                text: `Thank you for signing up! Please verify your email by clicking this link: ${verifyUrl}`
            });
            console.log('Verification email sent to:', email);
        } catch (emailErr) {
            console.error('Error sending verification email:', emailErr);
            return res.status(500).json({ error: 'Failed to send verification email. Please try resending.' });
        }

        return res.status(200).json({ message: 'Signup successful! Please check your email to verify your account.' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

server.post("/api/login", async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await User.findOne({ "personal_info.email": email });
        if (!user) {
            return res.status(403).json({ error: "Email not found" });
        }

        // Prevent Google-auth users from logging in with password
        if (user.google_auth) {
            return res.status(403).json({ error: "This account was created with Google. Please use Google sign-in." });
        }

        // Only allow login if verified
        if (!user.verified) {
            return res.status(403).json({ error: "Please verify your email before logging in. Check your inbox for the verification link." });
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

// Token validation endpoint
server.post("/api/validate-token", verifyJWT, (req, res) => {
    try {
        // If we reach here, the token is valid
        return res.status(200).json({ 
            valid: true, 
            message: "Token is valid",
            user: req.user 
        });
    } catch (err) {
        return res.status(401).json({ 
            valid: false, 
            error: "Token validation failed" 
        });
    }
});

// Token refresh endpoint
server.post("/api/refresh-token", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ error: "Refresh token is required" });
        }

        // For now, we'll implement a simple refresh mechanism
        // In a production environment, you should use proper refresh tokens
        const decoded = jwt.verify(refreshToken, process.env.SECRET_ACCESS_KEY, {
            audience: JWT_AUDIENCE,
            issuer: JWT_ISSUER,
            ignoreExpiration: true // Allow expired tokens for refresh
        });

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
            { id: user._id, admin: user.admin },
            process.env.SECRET_ACCESS_KEY,
            {
                expiresIn: JWT_EXPIRES_IN,
                audience: JWT_AUDIENCE,
                issuer: JWT_ISSUER
            }
        );

        return res.status(200).json({ 
            access_token: newAccessToken,
            message: "Token refreshed successfully"
        });
    } catch (err) {
        console.error('Token refresh error:', err);
        return res.status(401).json({ error: "Invalid refresh token" });
    }
});

server.post("/api/get-profile", (req, res) => {
    let { username } = req.body;

    User.findOne({ "personal_info.username": username })
        .select("-personal_info.password -google_auth -updateAt -blogs")
        .then(user => {
            if (!user) return res.status(404).json({ error: "User not found" });
            // Add total_posts to the response
            const userObj = user.toObject();
            userObj.total_posts = user.account_info?.total_posts || 0;
            return res.status(200).json(userObj);
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: err.message });
        });
});

server.post("/api/update-profile-img", verifyJWT, (req, res) => {
    let { url } = req.body;

    User.findOneAndUpdate({ _id: req.user }, { "personal_info.profile_img": url })
        .then(() => {
            return res.status(200).json({ profile_img: url });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
});

server.post("/api/update-profile", verifyJWT, (req, res) => {
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

server.post("/api/change-password", verifyJWT, (req, res) => {
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

server.post("/api/search-blogs-count", (req, res) => {
    let { tag, author } = req.body;

    // Match the query from search-blogs endpoint
    let findQuery = { draft: false };
    
    if (tag && tag.trim()) {
        findQuery.tags = { $regex: new RegExp(tag.trim(), 'i') };
    }

    if (author) {
        findQuery.author = author;
    }

    Blog.countDocuments(findQuery)
        .then(count => {
            console.log(`Total blogs count for tag: ${tag}, author: ${author} = ${count}`);
            return res.status(200).json({ totalDocs: count });
        })
        .catch(err => {
            console.error("Error in search-blogs-count:", err);
            return res.status(500).json({ error: err.message });
        });
});

server.post("/api/search-blogs", (req, res) => {
    let { tag, author, page = 1, eleminate_blog, query } = req.body;

    let findQuery = { draft: false };
    let orConditions = [];

    // General search by title or description
    if (query && query.trim()) {
        const regex = new RegExp(query.trim(), 'i');
        orConditions.push(
            { title: regex },
            { des: regex }
        );
    }

    // Tag filter
    if (tag && tag.trim()) {
        findQuery.tags = { $regex: new RegExp(tag.trim(), 'i') };
    }

    // Author filter
    if (author) {
        findQuery.author = author;
    }

    // Exclude the current blog if eleminate_blog is provided
    if (eleminate_blog) {
        findQuery.blog_id = { ...(findQuery.blog_id || {}), $ne: eleminate_blog };
    }

    // If orConditions exist, add $or to the query
    if (orConditions.length > 0) {
        findQuery.$or = orConditions;
    }

    let maxLimit = 12;
    let skipDocs = (page - 1) * maxLimit;

    Blog.find(findQuery)
        .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img")
        .sort({ "publishedAt": -1 })
        .select("title des banner activity publishedAt blog_id tags -_id")
        .skip(skipDocs)
        .limit(maxLimit)
        .then(blogs => {
            console.log(`Found ${blogs.length} blogs for query: ${query}, tag: ${tag}, author: ${author}, page: ${page}`);
            return res.status(200).json({ blogs });
        })
        .catch(err => {
            console.error("Error in search-blogs:", err);
            return res.status(500).json({ error: err.message });
        });
});

server.post("/api/all-latest-blogs-count", (req, res) => {
    Blog.countDocuments({ draft: false })
        .then(count => {
            return res.status(200).json({ totalDocs: count });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
});

server.get("/api/latest-blogs", (req, res) => {
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

server.post("/api/latest-blogs", (req, res) => {
    let { page = 1 } = req.body;
    let maxLimit = 12;
    let skipDocs = (page - 1) * maxLimit;

    Blog.find({ draft: false })
        .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img")
        .sort({ "publishedAt": -1 })
        .select("title des banner activity publishedAt blog_id tags -_id")
        .skip(skipDocs)
        .limit(maxLimit)
        .then(blogs => {
            return res.status(200).json({ blogs });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
});

server.post("/api/user-written-blogs-count", verifyJWT, (req, res) => {
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

server.post("/api/delete-blog", verifyJWT, async (req, res) => {
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
server.get("/api/test-upload", async (req, res) => {
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
server.post("/api/upload-image", verifyJWT, async (req, res) => {
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
server.post('/api/cleanup-unused-banners', verifyJWT, async (req, res) => {
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
server.post("/api/get-blog", async (req, res) => {
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
server.post("/api/get-blog-comments", async (req, res) => {
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
server.post("/api/create-blog", verifyJWT, async (req, res) => {
    try {
        let { title, des, banner, content, tags, draft } = req.body;
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
server.put("/api/update-blog/:blogId", verifyJWT, async (req, res) => {
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
server.post("/api/user-written-blogs", verifyJWT, async (req, res) => {
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
server.get("/api/trending-blogs", async (req, res) => {
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
server.post("/api/like-blog", verifyJWT, async (req, res) => {
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
            
            // Delete like notification
            await Notification.findOneAndDelete({
                type: 'like',
                user: user_id,
                blog: blog._id,
                notification_for: blog.author
            });
        } else {
            // Like
            await User.findByIdAndUpdate(user_id, {
                $addToSet: { liked_blogs: blog_id }
            });
            await Blog.findOneAndUpdate(
                { blog_id },
                { $inc: { "activity.total_likes": 1 } }
            );
            
            // Create like notification (only if not liking own blog)
            if (user_id.toString() !== blog.author.toString()) {
                await new Notification({
                    type: 'like',
                    user: user_id,
                    blog: blog._id,
                    notification_for: blog.author
                }).save();
            }
        }

        return res.status(200).json({ liked: !isLiked });
    } catch (err) {
        console.error("Error liking/unliking blog:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Bookmark/Unbookmark blog
server.post("/api/bookmark-blog", verifyJWT, async (req, res) => {
    try {
        let user_id = req.user;
        let { blog_id } = req.body;

        // Validate input
        if (!blog_id) {
            return res.status(400).json({ error: "Blog ID is required" });
        }

        // Check if blog exists
        const blog = await Blog.findOne({ blog_id });
        if (!blog) {
            return res.status(404).json({ error: "Blog not found" });
        }

        // Check if already bookmarked
        const user = await User.findById(user_id);
        if (user.bookmarked_blogs && user.bookmarked_blogs.includes(blog_id)) {
            return res.status(200).json({ bookmarked: true, message: "Already bookmarked" });
        }

        await User.findByIdAndUpdate(user_id, {
            $addToSet: { bookmarked_blogs: blog_id }
        });

        return res.status(200).json({ bookmarked: true });
    } catch (err) {
        console.error("Error bookmarking blog:", err);
        return res.status(500).json({ error: err.message });
    }
});

server.post("/api/unbookmark-blog", verifyJWT, async (req, res) => {
    try {
        let user_id = req.user;
        let { blog_id } = req.body;

        // Validate input
        if (!blog_id) {
            return res.status(400).json({ error: "Blog ID is required" });
        }

        // Check if blog exists
        const blog = await Blog.findOne({ blog_id });
        if (!blog) {
            return res.status(404).json({ error: "Blog not found" });
        }

        // Check if not bookmarked
        const user = await User.findById(user_id);
        if (!user.bookmarked_blogs || !user.bookmarked_blogs.includes(blog_id)) {
            return res.status(200).json({ bookmarked: false, message: "Not bookmarked" });
        }

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
server.post("/api/add-comment", verifyJWT, async (req, res) => {
    try {
        let user_id = req.user;
        let { blog_id, comment, blog_author, replying_to } = req.body;

        // Handle both blog_id and _id parameters for backward compatibility
        if (!blog_id && req.body._id) {
            blog_id = req.body._id;
        }

        if (!blog_id) {
            return res.status(400).json({ error: "Blog ID is required" });
        }

        const blog = await Blog.findOne({ blog_id });
        if (!blog) {
            return res.status(404).json({ error: "Blog not found" });
        }

        // If blog_author is not provided, use the blog's author
        if (!blog_author) {
            blog_author = blog.author;
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

        // Create notification for comment or reply
        if (replying_to) {
            // This is a reply to a comment
            const parentComment = await Comment.findById(replying_to);
            if (parentComment && user_id.toString() !== parentComment.commented_by.toString()) {
                await new Notification({
                    type: 'reply',
                    user: user_id,
                    blog: blog._id,
                    comment: newComment._id,
                    replied_on_comment: replying_to,
                    notification_for: parentComment.commented_by
                }).save();
            }
        } else {
            // This is a comment on the blog
            if (user_id.toString() !== blog.author.toString()) {
                await new Notification({
                    type: 'comment',
                    user: user_id,
                    blog: blog._id,
                    comment: newComment._id,
                    notification_for: blog.author
                }).save();
            }
        }

        // Populate user info for response
        await newComment.populate("commented_by", "personal_info.fullname personal_info.username personal_info.profile_img");

        return res.status(200).json({ success: true, comment: newComment });
    } catch (err) {
        console.error("Error adding comment:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Delete comment
server.post("/api/delete-comment", verifyJWT, async (req, res) => {
    try {
        let user_id = req.user;
        let { comment_id, blog_id } = req.body;

        if (!comment_id) {
            return res.status(400).json({ error: "Comment ID is required" });
        }

        // Find the comment
        const comment = await Comment.findById(comment_id);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        // Check if user can delete this comment (author or admin)
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const canDelete = comment.commented_by.toString() === user_id || user.admin === true;
        if (!canDelete) {
            return res.status(403).json({ error: "You don't have permission to delete this comment" });
        }

        // Check if this is a reply to another comment
        const isReply = comment.replying_to;
        
        // Delete the comment
        await Comment.findByIdAndDelete(comment_id);

        if (isReply) {
            // If it's a reply, update notifications to remove the reply reference
            await Notification.updateMany(
                { reply: comment_id },
                { $unset: { reply: 1 } }
            );
        } else {
            // If it's a main comment, delete all associated notifications
            await Notification.deleteMany({
                $or: [
                    { comment: comment_id },
                    { replied_on_comment: comment_id }
                ]
            });
        }

        // Decrement comment count if blog_id is provided
        if (blog_id) {
            await Blog.findOneAndUpdate(
                { blog_id },
                { $inc: { "activity.total_comments": -1 } }
            );
        }

        return res.status(200).json({ success: true, message: "Comment deleted successfully" });
    } catch (err) {
        console.error("Error deleting comment:", err);
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
server.get("/api/new-notification", verifyJWT, async (req, res) => {
    try {
        let user_id = req.user;
        
        // Check if user is admin
        const user = await User.findById(user_id);
        const isAdmin = user?.admin || user?.role === 'admin';
        
        let query = { 
            notification_for: user_id, 
            seen: false 
        };
        
        // For non-admin users, only check reply notifications
        if (!isAdmin) {
            query.type = 'reply';
        }
        // Admin users check all notification types
        
        // Check if user has any unread notifications
        const unreadCount = await Notification.countDocuments(query);
        
        return res.status(200).json({ 
            new_notification_available: unreadCount > 0 
        });
    } catch (err) {
        console.error("Error checking notifications:", err);
        return res.status(500).json({ error: "Failed to check notifications" });
    }
});

// Get notifications
server.post("/api/notifications", verifyJWT, async (req, res) => {
    try {
        let user_id = req.user;
        let { page = 1, filter = 'all', deletedDocCount = 0 } = req.body;
        
        // Check if user is admin
        const user = await User.findById(user_id);
        const isAdmin = user?.admin || user?.role === 'admin';
        
        let query = { notification_for: user_id };
        
        // For non-admin users, only show reply notifications
        if (!isAdmin) {
            query.type = 'reply';
        } else {
            // Admin users can see all notifications or filter as requested
            if (filter !== 'all') {
                query.type = filter;
            }
        }
        
        const notifications = await Notification.find(query)
            .populate("user", "personal_info.fullname personal_info.username personal_info.profile_img")
            .populate("blog", "blog_id title")
            .populate("comment", "comment commented_by")
            .populate("reply", "comment commented_by")
            .populate("replied_on_comment", "comment commented_by")
            .sort({ createdAt: -1 })
            .skip((page - 1) * 5)
            .limit(5);
        

            
        return res.status(200).json({ notifications });
    } catch (err) {
        console.error("Error fetching notifications:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Mark notifications as seen
server.post("/api/seen-notifications", verifyJWT, async (req, res) => {
    try {
        let user_id = req.user;
        await Notification.updateMany(
            { notification_for: user_id, seen: false },
            { seen: true }
        );
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("Error marking notifications as seen:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Get notifications count
server.post("/api/all-notifications-count", verifyJWT, async (req, res) => {
    try {
        let user_id = req.user;
        let { filter = 'all' } = req.body;
        
        // Check if user is admin
        const user = await User.findById(user_id);
        const isAdmin = user?.admin || user?.role === 'admin';
        
        let query = { notification_for: user_id };
        
        // For non-admin users, only count reply notifications
        if (!isAdmin) {
            query.type = 'reply';
        } else {
            // Admin users can count all notifications or filter as requested
            if (filter !== 'all') {
                query.type = filter;
            }
        }
        
        const count = await Notification.countDocuments(query);
        return res.status(200).json({ totalDocs: count });
    } catch (err) {
        console.error("Error counting notifications:", err);
        return res.status(500).json({ error: err.message });
    }
});

server.post('/api/google-auth', async (req, res) => {
    console.log("Attempting Google Auth...");
    console.log("GOOGLE_CLIENT_ID from env:", process.env.GOOGLE_CLIENT_ID);
    try {
        const { id_token } = req.body;
        console.log("Received ID token:", id_token);
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        // Decode token without verifying to inspect payload
        const base64Payload = id_token.split('.')[1];
        const decodedPayload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8'));
        console.log("Decoded token audience (aud):", decodedPayload.aud);
        console.log("Decoded token full payload:", decodedPayload);

        const ticket = await client.verifyIdToken({
            idToken: id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const email = payload.email;
        const picture = payload.picture;
        // Fallbacks for missing fields
        const name = payload.name || email.split('@')[0];
        const given_name = payload.given_name || name.split(' ')[0] || name;
        const family_name = payload.family_name || name.split(' ')[1] || 'GoogleUser';

        let user = await User.findOne({ "personal_info.email": email });

        if (user) {
            if (!user.google_auth) {
                return res.status(403).json({ error: "This email was signed up without Google. Please log in with a password to access the account." });
            }
        } else {
            const username = await generateUsername(email);
            user = new User({
                personal_info: {
                    fullname: name,
                    firstname: given_name,
                    lastname: family_name,
                    email,
                    profile_img: picture,
                    username
                },
                google_auth: true
            });
            await user.save();
            // Notify all admins about new user registration
            const admins = await User.find({ admin: true });
            for (const admin of admins) {
                await new Notification({
                    type: 'new_user',
                    notification_for: admin._id,
                    for_role: 'admin',
                    user: user._id
                }).save();
            }
        }
        return res.status(200).json(formatDatatoSend(user));
    } catch (err) {
        console.error('Google auth error:', err);
        return res.status(500).json({ error: "Failed to authenticate with Google. Try again with another account." });
    }
});

// Trending tags endpoint
server.get("/api/trending-tags", async (req, res) => {
    try {
        const tags = await Blog.aggregate([
            { $unwind: "$tags" },
            { $group: { _id: "$tags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ]);
        res.status(200).json({ tags });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fetch multiple blogs by their IDs (for bookmarks) with pagination
server.post("/api/get-blogs-by-ids", async (req, res) => {
    try {
        const { blog_ids, page = 1, limit = 5 } = req.body;
        
        // Validate input
        if (!Array.isArray(blog_ids)) {
            return res.status(400).json({ error: "blog_ids must be an array" });
        }
        
        if (!blog_ids.length) {
            return res.status(200).json({ blogs: [], totalDocs: 0 });
        }
        
        // Validate pagination parameters
        const validPage = Math.max(1, parseInt(page) || 1);
        const validLimit = Math.min(20, Math.max(1, parseInt(limit) || 5)); // Max 20, min 1
        
        const skip = (validPage - 1) * validLimit;
        
        // Filter out invalid blog_ids and find blogs
        const validBlogIds = blog_ids.filter(id => id && typeof id === 'string');
        const blogs = await Blog.find({ blog_id: { $in: validBlogIds } })
            .populate('author', 'personal_info.fullname personal_info.username personal_info.profile_img')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(validLimit);
            
        const totalDocs = validBlogIds.length;
        
        console.log("Received blog_ids:", blog_ids);
        console.log("Found blogs:", blogs);
        
        res.json({ blogs, totalDocs });
    } catch (err) {
        console.error("Error fetching blogs by IDs:", err);
        res.status(500).json({ error: err.message });
    }
});

// Delete a notification by ID
server.delete("/api/delete-notification/:id", verifyJWT, async (req, res) => {
    try {
        const notificationId = req.params.id;
        const user_id = req.user;
        const notification = await Notification.findById(notificationId);
        if (!notification) {
            return res.status(404).json({ error: "Notification not found" });
        }
        // Only the user the notification is for, or an admin, can delete
        if (notification.notification_for.toString() !== user_id && !req.userData?.admin) {
            return res.status(403).json({ error: "You do not have permission to delete this notification" });
        }
        await Notification.findByIdAndDelete(notificationId);
        return res.status(200).json({ success: true, message: "Notification deleted successfully" });
    } catch (err) {
        console.error("Error deleting notification:", err);
        return res.status(500).json({ error: "Failed to delete notification" });
    }
});

// Replace /contact endpoint to only handle form fields
server.post('/api/contact', async (req, res) => {
  try {
    const { subject, name, email, explanation } = req.body;
    if (!subject || !name || !email || !explanation) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    // Save to database
    const contact = new Contact({ subject, name, email, explanation });
    await contact.save();

    // Send email notification to admin
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.ADMIN_EMAIL_PASSWORD
      }
    });
    await transporter.sendMail({
      from: `Contact Form <${process.env.ADMIN_EMAIL}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `New Contact Message: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${explanation}`
    });

    res.json({ message: 'Message received! Thank you for contacting us.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process contact form.' });
  }
});

// Get recent comments for footer or other uses
server.get("/api/recent-comments", async (req, res) => {
    try {
        // Find the latest 10 comments
        const comments = await Comment.find({})
            .sort({ commentedAt: -1 })
            .limit(10)
            .populate("commented_by", "personal_info.fullname personal_info.username personal_info.profile_img");
        return res.status(200).json({ comments });
    } catch (err) {
        console.error("Error fetching recent comments:", err);
        return res.status(500).json({ error: "Failed to fetch recent comments" });
    }
});

// Newsletter subscription endpoint
server.post('/api/subscribe-newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }
    // Check if already subscribed
    let existing = await Newsletter.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already subscribed.' });
    }
    // Generate verification token
    const verificationToken = nanoid(32);
    await new Newsletter({ email, isActive: false, verificationToken }).save();

    // Send verification email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.ADMIN_EMAIL_PASSWORD
      }
    });
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-newsletter?token=${verificationToken}`;
    await transporter.sendMail({
      from: `Islamic Stories <${process.env.ADMIN_EMAIL}>`,
      to: email,
      subject: 'Confirm your newsletter subscription',
      text: `Thank you for subscribing! Please confirm your subscription by clicking this link: ${verifyUrl}`
    });

    // Notify all admins
    const admins = await User.find({ admin: true });
    for (const admin of admins) {
      await new Notification({
        type: 'newsletter',
        notification_for: admin._id,
        for_role: 'admin',
        // user is not required for newsletter notifications
      }).save();
    }

    res.json({ message: 'Subscription started! Please check your email to confirm your subscription.' });
  } catch (err) {
    console.error('Newsletter subscription error:', err);
    res.status(500).json({ error: 'Failed to subscribe.' });
  }
});

// Email verification endpoint for users
server.get('/api/verify-user', async (req, res) => {
    const { token } = req.query;
    try {
        let user = await User.findOne({ verificationToken: token });
        if (!user) return res.status(400).json({ error: "Invalid or expired verification link." });
        if (user.verified) return res.status(400).json({ error: "User already verified." });
        user.verified = true;
        user.verificationToken = undefined;
        await user.save();
        return res.status(200).json({ message: "Email verified! You can now log in." });
    } catch (err) {
        return res.status(400).json({ error: "Invalid or expired verification link." });
    }
});

server.post('/api/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ error: 'Valid email is required.' });
        }
        let user = await User.findOne({ "personal_info.email": email });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        if (user.verified) {
            return res.status(400).json({ error: 'User already verified.' });
        }
        // Generate new token
        const verificationToken = nanoid(32);
        user.verificationToken = verificationToken;
        await user.save();
        // Send verification email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.ADMIN_EMAIL,
                pass: process.env.ADMIN_EMAIL_PASSWORD
            }
        });
        const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-user?token=${verificationToken}`;
        await transporter.sendMail({
            from: `Islamic Stories <${process.env.ADMIN_EMAIL}>`,
            to: email,
            subject: 'Verify your email address',
            text: `Please verify your email by clicking this link: ${verifyUrl}`
        });
        return res.status(200).json({ message: 'Verification email resent. Please check your inbox.' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

server.get('/api/verify-newsletter', async (req, res) => {
    const { token } = req.query;
    try {
        let subscriber = await Newsletter.findOne({ verificationToken: token });
        if (!subscriber) return res.status(400).json({ error: "Invalid or expired verification link." });
        if (subscriber.isActive) return res.status(400).json({ error: "Subscription already verified." });
        subscriber.isActive = true;
        subscriber.verificationToken = undefined;
        await subscriber.save();
        return res.status(200).json({ message: "Subscription verified! Thank you for subscribing." });
    } catch (err) {
        return res.status(400).json({ error: "Invalid or expired verification link." });
    }
});

// Add this after other search endpoints
server.post("/api/search-users", async (req, res) => {
    try {
        const { query } = req.body;
        if (!query || typeof query !== "string" || !query.trim()) {
            return res.status(400).json({ error: "Query is required" });
        }
        // Build regex for case-insensitive partial match
        const regex = new RegExp(query.trim(), "i");
        // Search by fullname or username
        const users = await User.find({
            $or: [
                { "personal_info.fullname": regex },
                { "personal_info.username": regex }
            ]
        })
        .select("personal_info.fullname personal_info.username personal_info.profile_img")
        .limit(10); // Limit results for performance
        res.status(200).json({ users });
    } catch (err) {
        console.error("Error in /search-users:", err);
        res.status(500).json({ error: "Failed to search users" });
    }
});

server.listen(PORT, () => {
    console.log("listening on port " + PORT);
});
