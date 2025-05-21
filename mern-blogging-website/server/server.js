import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt'
import 'dotenv/config'
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import cors from 'cors';

//schema
import User from './Schema/User.js'
import Blog from './Schema/Blog.js'
import Notification from './Schema/Notification.js'

const server = express();
let PORT = 3000;
let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password
server.use(cors());
server.use(express.json({ limit: '50mb' }));
server.use(express.urlencoded({ limit: '50mb', extended: true }));


mongoose.connect(process.env.DB_LOCATION, {
    autoIndex: true
})
const formatDatatoSend = (user) => {
    const access_token = jwt.sign({ id: user._id }, process.env.SECRET_ACCESS_KEY)
    return {
        access_token,
        profile_img: user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname
    };
};
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];

    if (token == null) {
        return res.status(401).json({ error: "No access token" })
    }

    jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Access token is invalid" })
        }

        req.user = user.id
        next()
    })
}
const generateUsername = async (email) => {
    let username = email.split("@")[0];
    let isUsernameNotUnique = await User.exists({ "personal_info.username": username });
    isUsernameNotUnique ? username += nanoid().substring(0, 5) : "";
    return username;
};
server.post("/signup", (req, res) => {
    let { fullname, email, password } = req.body;

    // validating the data from frontend
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
            personal_info: { fullname, email, password: hashed_password, username }
        });

        user.save().then((u) => {
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
server.post("/login", (req, res) => {
    let { email, password } = req.body;

    User.findOne({ "personal_info.email": email })
        .then((user) => {
            if (!user) {
                return res.status(403).json({ "error": "Email not found" });
            }
            console.log(user);
            bcrypt.compare(password, user.personal_info.password, (err, result) => {
                if (err) {
                    return res.status(403).json({ "error": "Error occurred while logging in, please try again" });
                }

                if (!result) {
                    return res.status(403).json({ "error": "Incorrect password" });
                } else {
                    return res.status(200).json(formatDatatoSend(user));
                }
            });
        })
        .catch(err => {
            console.log(err.message);
            return res.status(500).json({ "error": err.message });
        });
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
server.post("/search-users", (req, res) => {
    let { query } = req.body;

    User.find({ "personal_info.username": new RegExp(query, "i") })
        .limit(50)
        .select("personal_info.fullname personal_info.username personal_info.profile_img -_id")
        .then((users) => {
            return res.status(200).json({ users });
        })
        .catch((err) => {
            return res.status(500).json({ error: err.message });
        });
});
server.get("/trending-blogs", (req, res) => {

    Blog.find({ draft: false })
        .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
        .sort({
            "activity.total_read": -1,
            "activity.total_likes": -1,
            "publishedAt": -1
        })
        .select("blog_id title publishedAt -_id")
        .limit(5)
        .then(blogs => {
            return res.status(200).json({ blogs })
        })
        .catch(err => {
            return res.status(500).json({ error: err.message })
        })
})
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

server.post("/search-blogs-count", (req, res) => {
    let { tag, author, query } = req.body;
    let findQuery;
    // let safeQuery = escapeRegex(query);


    // if (tag) {
    //     findQuery = {
    //         draft: false,
    //         tags: { $elemMatch: { $regex: tag, $options: 'i' } } // ← regex match for partial tags
    //     };
    // } else if (query) {
    //     findQuery = {
    //         draft: false,
    //         $or: [
    //             { title: new RegExp(safeQuery, 'i') },                // partial title match
    //             { tags: { $elemMatch: { $regex: query, $options: 'i' } } } // partial tag match too
    //         ]
    //     };
    // }
    if (tag) {
        findQuery = { tags: tag, draft: false };
    } else if (query) {
        findQuery = { draft: false, title: new RegExp(query, "i") };
    } else if (author) {
        findQuery = { author, draft: false };
    }


    Blog.countDocuments(findQuery)
        .then(count => {
            return res.status(200).json({ totalDocs: count });
        })
        .catch(err => {
            console.log(err.message);
            return res.status(500).json({ error: err.message });
        });
});


// server.post("/search-blogs", (req, res) => {
//     let { tag, query, page,author } = req.body;
//     //let safeQuery = escapeRegex(query);

//     let findQuery;

//     // if (tag) {
//     //     findQuery = {
//     //         draft: false,
//     //         tags: { $elemMatch: { $regex: tag, $options: 'i' } } // ← regex match for partial tags
//     //     };
//     // } else if (query) {
//     //     findQuery = {
//     //         draft: false,
//     //         $or: [
//     //             { title: new RegExp(safeQuery, 'i') },                // partial title match
//     //             { tags: { $elemMatch: { $regex: query, $options: 'i' } } } // partial tag match too
//     //         ]
//     //     };
//     // }
//     if (tag) {
//         findQuery = { tags: tag, draft: false };
//     } else if (query) {
//         findQuery = { draft: false, title: new RegExp(query, "i") };
//     } else if (author) {
//         findQuery = { author, draft: false };
//     }

//     let maxLimit = 2;

//     Blog.find(findQuery)
//         .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
//         .sort({ "publishedAt": -1 })
//         .select("blog_id title des banner activity tags publishedAt -_id")
//         .skip((page - 1) * maxLimit)

//         .limit(maxLimit)
//         .then(blogs => {
//             return res.status(200).json({ blogs });
//         })
//         .catch(err => {
//             return res.status(500).json({ error: err.message });
//         });
// });
server.post("/search-blogs", (req, res) => {
    let { tag, query, page, author, limit, eleminate_blog } = req.body;
    let findQuery;

    if (tag) {
        findQuery = { tags: tag, draft: false, blog_id: { $ne: eleminate_blog } };
    } else if (query) {
        findQuery = { draft: false, title: new RegExp(query, "i") };
    } else if (author) {
        findQuery = { author, draft: false };
    }

    let maxLimit = limit ? limit : 2;

    // Fetch total count and paginated blogs in parallel
    Promise.all([
        Blog.countDocuments(findQuery),
        Blog.find(findQuery)
            .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
            .sort({ "publishedAt": -1 })
            .select("blog_id title des banner activity tags publishedAt -_id")
            .skip((page - 1) * maxLimit)
            .limit(maxLimit)
    ])
        .then(([total, blogs]) => {
            return res.status(200).json({ blogs, total });
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
});
server.post("/all-latest-blogs-count", (req, res) => {
    Blog.countDocuments({ draft: false })
        .then(count => {
            return res.status(200).json({ totalDocs: count });
        })
        .catch(err => {
            console.log(err.message);
            return res.status(500).json({ error: err.message });
        });
});
// In server.js
server.post('/latest-blogs', (req, res) => {
    let { page } = req.body;
    let maxLimit = 5;

    Blog.find({ draft: false })
        .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
        .sort({ publishedAt: -1 })
        .select("blog_id title des banner activity tags publishedAt -_id")
        .skip((page - 1) * maxLimit)
        .limit(maxLimit)
        .then(blogs => {
            res.status(200).json({ blogs });
        })
        .catch(err => {
            res.status(500).json({ error: err.message });
        });
});
// Remove duplicate CORS setup and keep this one:
server.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));

// Update your create-blog endpoint
server.post('/create-blog', verifyJWT, async (req, res) => {
    try {
        const authorId = req.user;
        let { title, des, banner, tags, content, draft = false } = req.body;

        // Validate EditorJS content structure
        if (content && (!content.blocks || !Array.isArray(content.blocks))) {
            return res.status(400).json({
                error: "Invalid content format - must be EditorJS format with blocks array"
            });
        }

        // Process the content
        const cleanContent = content || { blocks: [] };

        // Generate blog ID
        const blog_id = `${title
            .replace(/[^a-zA-Z0-9]/g, ' ')
            .replace(/\s+/g, "-")
            .trim()}-${nanoid(10)}`;

        // Create blog
        const blog = new Blog({
            title,
            des,
            banner,
            content: cleanContent,
            tags: tags.map(tag => tag.toLowerCase()),
            author: authorId,
            blog_id,
            draft: Boolean(draft),
            publishedAt: draft ? null : new Date()
        });

        await blog.save();

        // Update user's post count if published
        if (!draft) {
            await User.findByIdAndUpdate(authorId, {
                $inc: { "account_info.total_posts": 1 },
                $push: { blogs: blog._id }
            });
        }

        return res.status(201).json({ id: blog.blog_id });
    } catch (err) {
        console.error("Blog creation error:", err);
        return res.status(500).json({
            error: "Failed to save blog",
            details: err.message
        });
    }
});

// server.post('/create-blog', verifyJWT, (req, res) => {
//     let authorId = req.user;
//     let { title, des, banner, tags, content, draft } = req.body;

//     if (!title.length) {
//         return res.status(403).json({ error: "You must provide a title" });
//     }

//     if (!draft) {
//         if (!des.length || des.length > 200) {
//             return res.status(403).json({ error: "You must provide blog description under 200 characters" });
//         }

//         if (!banner.length) {
//             return res.status(403).json({ error: "You must provide blog banner to publish it" });
//         }

//         if (!content?.blocks?.length) {
//             return res.status(403).json({ error: "There must be some blog content to publish it" });
//         }

//         if (!tags.length || tags.length > 10) {
//             return res.status(403).json({ error: "Provide tags in order to publish the blog, Maximum 10" });
//         }
//     }
//     tags = tags.map(tag => tag.toLowerCase());

//     let blog_id = title
//         .replace(/[^a-zA-Z0-9]/g, ' ')
//         .replace(/\s+/g, "-")
//         .trim()
//         + nanoid();
//     let blog = new Blog({
//         title,
//         des,
//         banner,
//         content,
//         tags,
//         author: authorId,
//         blog_id,
//         draft: Boolean(draft),
//         publishedAt: draft ? null : new Date()
//     });

//     blog.save().then(blog => {
//         let incrementVal = draft ? 0 : 1;

//         User.findOneAndUpdate(
//             { _id: authorId },
//             {
//                 $inc: { "account_info.total_posts": incrementVal },
//                 $push: { blogs: blog._id }
//             }
//         ).then(user => {
//             return res.status(200).json({ id: blog.blog_id });
//         }).catch(err => {
//             return res.status(500).json({ error: "Failed to update total posts number" });
//         });



//     }).catch(err => {
//         return res.status(500).json({ error: err.message });
//     });
// });
server.post("/get-blog", (req, res) => {
    let { blog_id, draft, mode } = req.body;
    let incrementVal = mode != 'edit' ? 1 : 0;

    Blog.findOneAndUpdate(
        { blog_id },
        { $inc: { "activity.total_reads": incrementVal } }
    )
        .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img")
        .select("title des content banner activity publishedAt blog_id tags")
        .then(blog => {
            User.findOneAndUpdate(
                { "personal_info.username": blog.author.personal_info.username },
                { $inc: { "account_info.total_reads": incrementVal } }
            )
                .then(() => {
                    return res.status(200).json({ blog });
                })
                .catch(err => {
                    return res.status(500).json({ error: err.message });
                });
            if (blog.draft && !draft) {
                return res.status(500).json({ error: 'you cannot access draft blogs' })
            }
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
});
server.post("/like-blog", verifyJWT, (req, res) => {
    let user_id = req.user;

    let { _id, isLikedByUser } = req.body;

    let incremental = !isLikedByUser ? 1 : -1;

    Blog.findOneAndUpdate(
        { _id },
        { $inc: { "activity.total_likes": incremental } }
    )
        .then(blog => {
            if (isLikedByUser) {
                let like = new Notification({
                    type: "like",
                    blog: _id,
                    notification_for: blog.author,
                    user: user_id
                });
                like.save().then(notification => {
                    return res.status(200).json({ liked_by_user: true })
                })
            }
        })
});
server.listen(PORT, () => {
    console.log('listening on port=' + PORT);
})
