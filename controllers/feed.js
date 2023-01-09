const { validationResult } = require("express-validator/check");
const Post = require("../models/post");
const User = require("../models/user");
const errorHandler = require("../utils/error-handler").errorHandler;
const throwError = require("../utils/error-handler").throwError;
const clearImage = require("../utils/clear-image");
const io = require("../socket");

exports.getPosts = async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const items_per_page = 2;
    let totalItems = 0;
    const count = await Post.countDocuments();

    if (count) {
      totalItems = count;
    }
    const posts = await Post.find()
      .populate("creator")
      .skip((page - 1) * items_per_page)
      .limit(items_per_page)
      .sort({ createdAt: -1 });
    if (!posts) {
      throwError("No Posts Found", 404);
    }
    // console.log(posts);
    res.status(200).json({
      message: "Post fetched successfully",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (errors) {
    errorHandler(errors, next);
  }
};

exports.createPost = async (req, res, next) => {
  try {
    const errors = validationResult(req).errors;
    if (errors.length > 0) {
      throwError("Validation failed Bad Input!", 422);
    }
    const title = req.body.title;
    const content = req.body.content;
    if (!req.file) {
      throwError("Invalid File uploaded", 422);
    }
    const imageUrl = req.file.path.replace("\\", "/");

    const post = new Post({
      title: title,
      content: content,
      imageUrl: imageUrl,
      creator: req.userId,
    });

    const createdPost = await post.save();
    if (createdPost) {
      const user = await User.findById(req.userId);
      user.posts.push(post);
      const data = await user.save();
      if (data) {
        io.getIO().emit("posts", {
          actions: "create-post",
          post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
        });
        res.status(201).json({
          message: "Post created Successfully",
          post: createdPost,
          creator: data._id,
        });
      }
    }
  } catch (errors) {
    errorHandler(errors, next);
  }
};

exports.getSinglePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      throwError("No post found", 404);
    }
    res.status(200).json({
      message: "Post fetched successfully",
      post: post,
    });
  } catch (errors) {
    errorHandler(errors, next);
  }
};

exports.updatePost = async (req, res, next) => {
  try {
    const errors = validationResult(req).errors;
    if (errors.length > 0) {
      throwError("Validation failed Bad Input!", 422);
    }
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;
    if (req.file) {
      imageUrl = req.file.path.replace("\\", "/");
    }
    if (!imageUrl) {
      throwError("No file picked", 422);
    }

    const existingPost = await Post.findById(postId).populate("creator");
    if (!existingPost) {
      throwError("No Post found", 404);
    }

    if (imageUrl !== existingPost.imageUrl) {
      clearImage(existingPost.imageUrl);
    }

    if (existingPost.creator._id.toString() !== req.userId) {
      throwError("Not authorized!", 403);
    }
    existingPost.title = title;
    existingPost.content = content;
    existingPost.imageUrl = imageUrl;
    const result = await existingPost.save();
    io.getIO().emit("posts", { actions: "update", post: result });
    res.status(200).json({
      message: "Post updated Successfully",
      post: result,
    });
  } catch (errors) {
    errorHandler(errors, next);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const post = await Post.findById(postId);
    if (!post) {
      throwError("No Post found", 404);
    }
    if (post.creator.toString() !== req.userId) {
      throwError("Not Authorized", 403);
    }
    clearImage(post.imageUrl);
    const result = await Post.findByIdAndDelete(postId);
    if (result) {
      const user = await User.findById(req.userId);
      if (user) {
        user.posts.pull(postId);
        const result = await user.save();
        io.getIO().emit("posts", { actions: "delete", post: postId });
        if (result) {
          res.status(200).json({
            message: "Post deleted successfully",
            result: result,
          });
        }
      }
    }
  } catch (errors) {
    errorHandler(errors, next);
  }
};
