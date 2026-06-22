# LankaTravel Backend API

<div align="center">

**A robust RESTful API powering Sri Lanka's premium travel booking platform.**

🌐 **Live API:** [https://travel-lanka-be.vercel.app](https://travel-lanka-be.vercel.app)

</div>

---

##  Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Authentication](#authentication)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Deployment](#deployment)

---

## Overview

LankaTravel Backend is a production-ready Express/TypeScript REST API serving the LankaTravel platform — a full-featured Sri Lanka tourism and travel booking application. It handles user authentication, destination management, stay bookings, event listings, AI-powered trip planning, payment processing, and more.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Authentication | JWT (Access + Refresh Tokens) |
| OAuth | Passport.js (Google, Facebook) |
| Image Storage | Cloudinary |
| Payments | PayHere |
| AI | Google Gemini API |
| Email | Nodemailer |
| Deployment | Vercel (Serverless) |

---

## Features

### Authentication & Authorization
- JWT-based authentication with **access tokens** and **refresh tokens**
- **Google OAuth** and **Facebook OAuth** via Passport.js
- Role-based access control — `user`, `admin`
- Secure password hashing with bcrypt

###  Destinations
- Full CRUD for Sri Lankan destinations
- Up to 5 images per destination via Cloudinary
- Geolocation support with interactive Leaflet map coordinate picking
- Sparse 2dsphere index for optional coordinate fields
- OSRM-based travel time routing via backend proxy

### Stays
- Accommodation listings with availability management
- Cloudinary image uploads
- Admin CRUD dashboard

### Events
- Event listings with booking support
- Admin management interface

###  AI Trip Planner
- Google Gemini-powered personalised trip planning
- Fuzzy destination matching for natural language queries
- Structured itinerary generation

###  Payments
- **PayHere** payment gateway integration
- Webhook handling with URL-encoded middleware
- Sandbox testing support via ngrok

###  Notifications
- Nodemailer email notifications
- Branded HTML email templates
- WhatsApp `wa.me` deep links for agent contact

###  Reviews & Wishlist
- User reviews for destinations
- Wishlist system for saving favourite destinations

###  Weather Widget
- Sri Lanka city weather mapping
- Integrated weather data endpoint

---

## Project Structure

```
travel-lanka-be/
├── src/
│   ├── config/
│   │   ├── db.ts                  # MongoDB Atlas connection
│   │   ├── cloudinary.ts          # Cloudinary config
│   │   └── passport.ts            # OAuth strategies
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── destinationController.ts
│   │   ├── stayController.ts
│   │   ├── eventController.ts
│   │   ├── bookingController.ts
│   │   ├── reviewController.ts
│   │   ├── wishlistController.ts
│   │   ├── aiController.ts        # Gemini AI trip planner
│   │   ├── paymentController.ts   # PayHere integration
│   │   ├── weatherController.ts
│   │   └── adminController.ts
│   ├── middleware/
│   │   ├── authMiddleware.ts      # JWT verification
│   │   ├── adminMiddleware.ts     # Role-based guard
│   │   └── uploadMiddleware.ts    # Multer + Cloudinary
│   ├── models/
│   │   ├── User.ts
│   │   ├── Destination.ts
│   │   ├── Stay.ts
│   │   ├── Event.ts
│   │   ├── Booking.ts
│   │   ├── Review.ts
│   │   └── Wishlist.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── destinationRoutes.ts
│   │   ├── stayRoutes.ts
│   │   ├── eventRoutes.ts
│   │   ├── bookingRoutes.ts
│   │   ├── reviewRoutes.ts
│   │   ├── wishlistRoutes.ts
│   │   ├── aiRoutes.ts
│   │   ├── paymentRoutes.ts
│   │   ├── weatherRoutes.ts
│   │   └── adminRoutes.ts
│   └── index.ts                   # App entry point
├── vercel.json
├── tsconfig.json
├── package.json
└── README.md
```

---

## Authentication

This API uses **JWT Bearer token** authentication.

```
Authorization: Bearer <access_token>
```

- **Access Token** — Short-lived (e.g. 15 min), sent in Authorization header
- **Refresh Token** — Long-lived, stored in HTTP-only cookie, used to issue new access tokens

### OAuth Flow

Google and Facebook OAuth are handled via Passport.js. On successful login, the user is redirected to the frontend with JWT tokens as query params or cookies.

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
DB_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/lanka-travel

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# PayHere
PAYHERE_MERCHANT_ID=your_merchant_id
PAYHERE_SECRET=your_payhere_secret

# Nodemailer
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Frontend URL (for CORS)
CLIENT_URL=https://travel-lanka-fe.vercel.app
```

---

## Getting Started

### Prerequisites

- Node.js >= 18.x
- MongoDB Atlas account
- Cloudinary account

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/travel-lanka-be.git
cd travel-lanka-be

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your values in .env

# Run in development
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## Deployment

This backend is deployed on **Vercel** as serverless functions.

### `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.ts"
    }
  ]
}
```

### Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

>  **Note:** Vercel serverless functions have a **4.5MB payload limit**. For image uploads, use **direct Cloudinary upload from the frontend** using an unsigned upload preset, then send only the resulting URLs to this API.

---



---

<div align="center">

Made with love for Sri Lanka 🇱🇰

</div>
