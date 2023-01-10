const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const errorHandler = require("../utils/error-handler").throwError;
const User = require("../models/user");
const Post = require("../models/post");
const validator = require("validator");
const secretKey = require("../utils/password").secret;
const clearImage = require("../utils/clear-image");

module.exports = {
  signupUser: async function ({ userInput }, req) {
    try {
      const errors = [];
      if (!validator.isEmail(userInput.email)) {
        errors.push({ message: "Invalid email" });
      }
      if (
        validator.isEmpty(userInput.password) ||
        !validator.isLength(userInput.password, { min: 8 })
      ) {
        errors.push({ message: "Passowrd is too short" });
      }
      if (errors.length > 0) {
        errorHandler("Bad Input", 422, errors);
      }
      const existingUser = await User.findOne({ email: userInput.email });
      if (existingUser) {
        errorHandler("User already exists", 422);
      }
      const HASHED_PASSWORD = await bcrypt.hash(userInput.password, 12);
      const user = new User({
        email: userInput.email,
        password: HASHED_PASSWORD,
        name: userInput.name,
      });
      const createdUser = await user.save();
      return { ...createdUser._doc, _id: createdUser._id.toString() };
    } catch (error) {
      throw error;
    }
  },
  loginUser: async function ({ email, password }, req) {
    try {
      const errors = [];
      if (!validator.isEmail(email)) {
        errors.push({ message: "Invalid email address" });
      }
      if (
        validator.isEmpty(password) ||
        !validator.isLength(password, { min: 8 })
      ) {
        errors.push({ message: "Passwords must be atleast 8 characters long" });
      }
      if (errors.length > 0) {
        errorHandler("Bad Input!", 422, errors);
      }
      const user = await User.findOne({ email: email });
      if (!user) {
        errorHandler("User Not Found", 401);
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        errorHandler("Invalid email or password", 422);
      }
      const userId = user._id.toString();
      const token = jwt.sign(
        {
          email: email,
          userId: userId,
        },
        secretKey,
        { expiresIn: "1h" }
      );

      return { token: token, userId: userId };
    } catch (error) {
      throw error;
    }
  },
  createPost: async function ({ userInput }, req) {
    try {
      if (!req.isAuth) {
        errorHandler("Not authenticated", 401);
      }
      const errors = [];
      if (
        validator.isEmpty(userInput.title) ||
        !validator.isLength(userInput.title, { min: 5 })
      ) {
        errors.push({ message: "The title is too short, minimum length is 5" });
      }
      if (
        validator.isEmpty(userInput.content) ||
        !validator.isLength(userInput.content, { min: 5 })
      ) {
        errors.push({
          message: "The content is too short, minimum length is 5",
        });
      }
      if (errors.length > 0) {
        errorHandler("Bad Input!", 422, errors);
      }

      const user = await User.findById(req.userId);
      if (!user) {
        errorHandler("Invalid user", 403);
      }

      const post = new Post({
        title: userInput.title,
        content: userInput.content,
        imageUrl: userInput.imageUrl,
        creator: user,
      });

      const createdPost = await post.save();
      user.posts.push(createdPost);
      await user.save();
      return {
        ...createdPost._doc,
        _id: createdPost._id.toString(),
        createdAt: createdPost.createdAt.toISOString(),
        updatedAt: createdPost.updatedAt.toISOString(),
      };
    } catch (error) {
      throw error;
    }
  },
  loadPosts: async function ({ currentPage }, req) {
    try {
      if (!req.isAuth) {
        errorHandler("Not authenticated", 401);
      }

      const page = currentPage || 1;
      const items_per_page = 2;
      const totalPosts = await Post.find().countDocuments();
      const posts = await Post.find()
        .skip((page - 1) * items_per_page)
        .limit(items_per_page)
        .sort({ createdAt: -1 })
        .populate("creator");
      if (!posts) {
        errorHandler("No posts found", 404);
      }
      return {
        posts: posts.map((p) => {
          return {
            ...p._doc,
            _id: p._id.toString(),
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          };
        }),
        totalPosts: totalPosts,
      };
    } catch (error) {
      throw error;
    }
  },
  singlePost: async function ({ postId }, req) {
    try {
      if (!req.isAuth) {
        errorHandler("Not authenticated", 401);
      }
      const post = await Post.findById(postId).populate("creator");
      if (!post) {
        errorHandler("Post not found", 404);
      }

      return {
        ...post._doc,
        _id: post._id.toString(),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      };
    } catch (error) {
      throw error;
    }
  },
  updatePost: async function ({ postId, userInput }, req) {
    try {
      if (!req.isAuth) {
        errorHandler("Not authenticated", 401);
      }
      const errors = [];
      if (
        validator.isEmpty(userInput.title) ||
        !validator.isLength(userInput.title, { min: 5 })
      ) {
        errors.push({
          message: "The title is too short, minimum length is 5",
        });
      }
      if (
        validator.isEmpty(userInput.content) ||
        !validator.isLength(userInput.content, { min: 5 })
      ) {
        errors.push({
          message: "The content is too short, minimum length is 5",
        });
      }
      if (errors.length > 0) {
        errorHandler("Bad Input!", 422, errors);
      }
      // console.log(userInput);
      const post = await Post.findById(postId).populate("creator");

      if (!post) {
        errorHandler("No post found", 404);
      }
      if (post.creator._id.toString() !== req.userId.toString()) {
        errorHandler("Not auhtorized", 403);
      }
      console.log(userInput.imageUrl);

      if (userInput.imageUrl !== "undefined") {
        console.log(post.imageUrl);
        post.imageUrl = userInput.imageUrl;
      }
      post.title = userInput.title;
      post.content = userInput.content;
      const updatedPost = await post.save();
      return {
        ...updatedPost._doc,
        _id: updatedPost._id.toString(),
        createdAt: updatedPost.createdAt.toISOString(),
        updatedAt: updatedPost.updatedAt.toISOString(),
      };
    } catch (errors) {
      throw errors;
    }
  },
  deletePost: async function ({ postId }, req) {
    try {
      if (!req.isAuth) {
        errorHandler("Not authenticated", 401);
      }
      const deletedPost = await Post.findById(postId).populate("creator");
      if (deletedPost.creator._id.toString() !== req.userId.toString()) {
        errorHandler("Not authenticated", 403);
      }
      clearImage(deletedPost.imageUrl);
      await Post.findByIdAndRemove(postId);
      const user = await User.findById(req.userId);
      user.posts.pull(deletedPost);
      await user.save();
      return {
        ...deletedPost._doc,
        _id: deletedPost._id,
        createdAt: deletedPost.createdAt.toISOString(),
        updatedAt: deletedPost.updatedAt.toISOString(),
      };
    } catch (error) {
      throw error;
    }
  },
  userStatus: async function (__, req) {
    try {
      if (!req.isAuth) {
        errorHandler("Not authenticated", 401);
      }
      const user = await User.findById(req.userId);
      if (!user) {
        errorHandler("No status found", 404);
      }
      const status = user.status;
      return status;
    } catch (error) {
      throw error;
    }
  },
  updateStatus: async function ({ userInput }, req) {
    try {
      if (!req.isAuth) {
        errorHandler("Not authenticated", 401);
      }
      const errors = [];
      if (
        validator.isEmpty(userInput.status) ||
        !validator.isLength(userInput.status, { min: 5 })
      ) {
        errors.push({ message: "Status is too short" });
      }
      if (errors.length > 0) {
        errorHandler("Bad Input", 422, errors);
      }

      const user = await User.findById(req.userId);
      if (!user) {
        errorHandler("User does not exist", 404);
      }

      if (user._id.toString() !== req.userId.toString()) {
        errorHandler("Not authorized", 403);
      }

      user.status = userInput.status;
      await user.save();
      return user.status;
    } catch (error) {
      throw error;
    }
  },
};
