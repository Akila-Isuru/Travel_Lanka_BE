import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import UserModel from "../models/userModel";

// 1. GOOGLE STRATEGY
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: "/api/v1/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        if (!email)
          return done(new Error("No email found from Google"), undefined);

        let user = await UserModel.findOne({ email });

        if (!user) {
          user = new UserModel({
            name: profile.displayName,
            email: email,
            password: "social-login-secure-dummy-password",
            roles: ["USER"],
          });
          await user.save();
        }
        return done(null, user);
      } catch (error) {
        return done(error, undefined);
      }
    },
  ),
);

// 2. FACEBOOK STRATEGY
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID as string,
      clientSecret: process.env.FACEBOOK_APP_SECRET as string,
      callbackURL: "/api/v1/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails"],
    },
    // src/config/passport.ts එකේ Facebook Strategy එක ඇතුලේ:
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Facebook එකෙන් email එනවා නම් ඒක ගන්න, නැත්නම් ID එක පාවිච්චි කරලා Dummy එකක් හදනවා
        const email = profile.emails?.[0].value || `${profile.id}@facebook.com`;

        let user = await UserModel.findOne({ email });

        if (!user) {
          user = new UserModel({
            name: profile.displayName,
            email: email, // දැන් මෙතනට Dummy email එකක් හරි වැටෙනවා
            password: "social-login-secure-dummy-password",
            roles: ["USER"],
          });
          await user.save();
        }
        return done(null, user);
      } catch (error) {
        return done(error, undefined);
      }
    },
  ),
);

export default passport;
