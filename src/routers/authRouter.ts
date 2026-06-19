import { Router } from "express";
import {
  registerUser,
  loginUser,
  getMyDetails,
} from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import passport from "passport";
import { signAccessToken, signRefreshToken } from "../utils/token";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", authenticate, getMyDetails);

// GOOGLE OAUTH ROUTES

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
