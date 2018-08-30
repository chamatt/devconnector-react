const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");

//Post model
const Post = require("../../models/Post");

// Validation
const validadePostInput = require("../../validations/posts");

// @route  GET api/post/test
// @desc   Tests post route
// @access Public
router.get("/test", (req, res) =>
  res.json({
    test: "posts works"
  })
);

// @route  GET api/posts
// @desc   GET posts
// @access Public
router.get("/", (req, res) => {
  Post.find()
    .sort({ date: -1 })
    .then(posts => res.json(posts))
    .catch(err => res.status(404));
});

// @route  GET api/posts/post_id
// @desc   Get a single post
// @access Public
router.get("/:post_id", (req, res) => {
  Post.findOne({ _id: req.params.post_id })
    .then(post => res.json(post))
    .catch(err => res.status(404));
});

// @route  POST api/posts
// @desc   Create post
// @access Private
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = validadePostInput(req.body);

    if (!isValid) {
      return res.status(400).json(errors);
    }

    const newPost = new Post({
      text: req.body.text,
      name: req.body.name,
      avatar: req.body.avatar,
      user: req.user.id
    });

    newPost.save().then(post => res.json(post));
  }
);

// @route  DELETE api/posts/post_id
// @desc   Delete a single post
// @access Private
router.delete(
  "/:post_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Post.findOne({ _id: req.params.post_id })
      .then(post => {
        if (post.user == req.user.id) {
          post.remove().then(() => res.json({ success: true }));
        } else {
          res.status(401).res.json({ notauthorized: "User not authorized" });
        }
      })
      .catch(err => res.status(404).json({ postnotfound: "No post found" }));
  }
);

// @route  POST api/posts/like/:post_id
// @desc   Like post
// @access Private
router.post(
  "/like/:post_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Post.findOne({ _id: req.params.post_id })
      .then(post => {
        const alreadyLiked =
          post.likes.filter(like => like.user.toString() == req.user.id)
            .length > 0;

        if (alreadyLiked) {
          return res
            .status(400)
            .json({ alreadyliked: "User already liked this post" });
        } else {
          // Add user id to likes array
          post.likes.unshift({ user: req.user.id });

          post.save().then(post => res.json(post));
        }
      })
      .catch(err => res.status(404).json({ postnotfound: "No posts found" }));
  }
);

// @route  POST api/posts/unlike/:post_id
// @desc   Unlike post
// @access Private
router.post(
  "/unlike/:post_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Post.findOne({ _id: req.params.post_id }).then(post => {
      const alreadyLiked =
        post.likes.filter(like => like.user.toString() == req.user.id).length >
        0;
      if (alreadyLiked) {
        const removeIndex = post.likes
          .map(like => like.user.toString())
          .indexOf(req.user.id);
        post.likes.splice(removeIndex, 1);
        post.save().then(() => res.json({ success: true }));
      } else {
        res.json({ notlikes: "You've haven't liked this post yet" });
      }
    });
  }
);

// @route  DELETE api/posts/comment/:id/:post_id
// @desc   Delete comment from post
// @access Private
router.delete(
  "/comment/:post_id/:comment_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Post.findOne({ _id: req.params.post_id })
      .then(post => {
        // Check to see if comment exists
        if (
          post.comments.filter(
            comment => comment._id.toString() === req.params.comment_id
          ).length === 0
        ) {
          return res
            .status(404)
            .json({ commentnotexists: "Comment does not exist" });
        }
        // Get remove index
        const removeIndex = post.comments
          .map(item => item._id.toString())
          .indexOf(req.params.comment_id);

        //Check to see if it's the owner of the comment
        if (post.comments[removeIndex].user != req.user.id) {
          return res
            .status(401)
            .json({ notauthorized: "You are not the owner of the comment" });
        }
        // Splice comment out of array
        post.comments.splice(removeIndex, 1);

        post.save().then(post => res.json(post));
      })
      .catch(err => res.status(404).json(err));
  }
);

// @route  POST api/posts/comment/:id
// @desc   Add comment to post
// @access Private
router.post(
  "/comment/:post_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = validadePostInput(req.body);

    if (!isValid) {
      return res.status(400).json(errors);
    }

    Post.findOne({ _id: req.params.post_id })
      .then(post => {
        if (!post)
          return res.status(404).json({ postnotfound: "No posts found" });
        const newComment = {
          text: req.body.text,
          name: req.body.name,
          avatar: req.body.avatar,
          user: req.user.id
        };
        post.comments.push(newComment);
        post.save().then(res.json({ success: true }));
      })
      .catch(() => res.status(404).json({ postnotfound: "No posts found" }));
  }
);

module.exports = router;
