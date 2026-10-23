const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        default: "Guest"
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    likes: {
        type: Number,
        default: 0
    },
    comments: [{
        username: { type: String, default: "Guest" },
        text: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model("Post", postSchema);