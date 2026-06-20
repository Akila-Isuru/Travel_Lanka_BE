import { Router } from "express";
import {
  registerUser,
  loginUser,
  getMyDetails,
  forgotPassword,
  validateResetToken,
  resetPassword,
} from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import passport from "passport";
import { signAccessToken, signRefreshToken } from "../utils/token";

const router = Router();

// ===== Auth routes =====
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", authenticate, getMyDetails);

// ===== NEW: Password reset routes =====
router.post("/forgot-password", forgotPassword);
router.get("/validate-token/:token", validateResetToken);
router.post("/reset-password", resetPassword);

// ===== Google OAuth =====
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  (req: any, res: any) => {
    const user = req.user;
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.redirect(
      `http://localhost:5173/oauth-callback?token=${accessToken}&refresh=${refreshToken}`,
    );
  },
);

// ===== Facebook OAuth =====
router.get("/facebook", passport.authenticate("facebook"));

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "/login",
    session: false,
  }),
  (req: any, res: any) => {
    const user = req.user;
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.redirect(
      `http://localhost:5173/oauth-callback?token=${accessToken}&refresh=${refreshToken}`,
    );
  },
);

export default router;
