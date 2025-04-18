import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import router from "./playlist.routes";


const express = require("express");
// const passport = require("passport");
// const jwt = require("jsonwebtoken");
const router = express.Router();

// Google OAuth
router.get("/auth/google", passport.authenticate("google", {
  scope: ["profile", "email"]
}));

router.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d"
    });

    // redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${token}`);
  }
);

// GitHub OAuth
router.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));

router.get("/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d"
    });

    res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${token}`);
  }
);

// Facebook OAuth
router.get("/auth/facebook", passport.authenticate("facebook", { scope: ["email"] }));

router.get("/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d"
    });

    res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${token}`);
  }
);

module.exports = router;
