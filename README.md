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
   git clone <repository-url>
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
