# ASCENT-Backend

The backend API for the ASCENT workout and fitness application. This API manages exercises, workout splits, user progress, and sessions.

## Project Overview

ASCENT-Backend is a RESTful API built with Node.js and Express. It serves as the data layer for the ASCENT fitness platform, handling:
- **Exercises**: Database of workout exercises.
- **Splits**: Workout split recommendations based on user goals, experience, and availability.
- **Sessions**: Tracking of user workout sessions.
- **Users**: User profiles and settings.

## Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) using [Mongoose](https://mongoosejs.com/) ORM
- **Authentication**: (To be implemented/documented if present)
- **Utilities**: `dotenv` for configuration, `cors` for Cross-Origin Resource Sharing.

## Setup & Installation

### Prerequisites

- Node.js (v14 or higher recommended)
- MongoDB (Local instance or Atlas URI)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/HemeshKanyal/ASCENT-Backend.git
   cd workout-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the root directory. You can use the example below as a reference (ensure you have the keys):
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   ```

4. **Run the server:**
   
   For development (using nodemon):
   ```bash
   npx nodemon server.js
   ```
   
   Standard run:
   ```bash
   node server.js
   ```

   The server will start on `http://localhost:5000` (or your defined PORT).

## API Documentation

### Exercises
- `GET /api/exercises` - Get all exercises.
- `GET /api/exercises/filter` - Get exercises filtered by criteria.
- `GET /api/exercises/:id` - Get details of a specific exercise.

### Splits
- `GET /api/splits/recommend` - Get recommended workout splits based on query parameters (`experience`, `days`, `goal`, `type`).

### Health Check
- `GET /` - Returns "Workout API Running".

## Project Structure

For a detailed look at the project's architecture, please refer to [ARCHITECTURE.md](./ARCHITECTURE.md).

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Community API (phase 2)

Friends (by code or @handle), posts with photos/videos (GridFS, streamed with HTTP Range), kudos, comments, clubs with invite codes, weekly leaderboards and an in-app inbox. Requires `MONGO_URI` and a `JWT_SECRET` of at least 32 characters (see `.env.example`).

```bash
npm test   # runs against an in-memory MongoDB (mongodb-memory-server)
npm start
```

## Deploy (Render + MongoDB Atlas)

1. **Atlas**: create a free M0 cluster, a database user, and allow network access from `0.0.0.0/0` (Render's free tier has no fixed IP). Copy the connection string and add the database name, e.g. `…mongodb.net/ascent?retryWrites=true&w=majority`.
2. **Render**: New → Blueprint → this repo. `render.yaml` sets up the service, generates `JWT_SECRET`, and asks for `MONGO_URI`.
3. Check `https://<service>.onrender.com/health` → `{"ok":true,"db":"connected"}`.
4. Point the app at it with `EXPO_PUBLIC_API_URL=https://<service>.onrender.com` in ASCENT-Frontend.

The free plan sleeps after ~15 minutes idle; the first request after that takes 30–60 s. Media lives in MongoDB (GridFS), so the free 512 MB covers a small group of friends — watch usage in Atlas.
