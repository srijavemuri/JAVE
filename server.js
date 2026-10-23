
require("dotenv").config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Post = require("./models/Post.js");
const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Register a new user
app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Please fill in all fields."
            });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanUsername.length < 3 || cleanUsername.length > 30) {
            return res.status(400).json({
                message: "Username must be 3 to 30 characters."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters."
            });
        }

        const existingUser = await User.findOne({
            $or: [
                { username: cleanUsername },
                { email: cleanEmail }
            ]
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Username or email is already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            username: cleanUsername,
            email: cleanEmail,
            password: hashedPassword
        });

        res.status(201).json({
            message: "Registration successful!",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Registration error:", error.message);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Username or email is already registered."
            });
        }

        res.status(500).json({
            message: "Could not register. Please try again."
        });
    }
});

// Log in an existing user
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Please enter your email and password."
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        res.json({
            message: "Login successful!",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({
            message: "Could not log in. Please try again."
        });
    }
});

// Get all posts
app.get("/api/posts", async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        console.error("Fetch posts error:", error.message);
        res.status(500).json({
            message: "Could not fetch posts."
        });
    }
});

// Create a post
app.post("/api/posts", async (req, res) => {
    try {
        const { username, content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({
                message: "Post content cannot be empty."
            });
        }

        const post = await Post.create({
            username: username || "Guest",
            content: content.trim()
        });

        res.status(201).json(post);
    } catch (error) {
        console.error("Create post error:", error.message);
        res.status(500).json({
            message: "Could not create post."
        });
    }
});
app.post("/api/posts/:id/comments", async (req, res) => {
    try {
        const { username, text } = req.body;
        if (!text?.trim()) {
            return res.status(400).json({ error: "Comment cannot be empty" });
        }

        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { $push: { comments: { username: username || "Guest", text: text.trim() } } },
            { new: true, runValidators: true }
        );

        if (!post) return res.status(404).json({ error: "Post not found" });
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: "Could not add comment" });
    }
});
// Like a post
app.patch("/api/posts/:id/like", async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { $inc: { likes: 1 } },
            { new: true, runValidators: true }
        );

        if (!post) {
            return res.status(404).json({
                message: "Post not found."
            });
        }

        res.json(post);
    } catch (error) {
        console.error("Like post error:", error.message);
        res.status(400).json({
            message: "Could not like post."
        });
    }
});

// Connect to MongoDB and start server
async function startServer() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI missing. Check your .env file.");
        }

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connected successfully!");

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Connection error:", error.message);
    }
}

startServer();