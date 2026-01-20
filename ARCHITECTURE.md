# Architecture & Directory Structure

This document provides a high-level overview of the ASCENT-Backend architecture to help new developers find their way around the codebase.

## High-Level Overview

The application follows a standard **MVC (Model-View-Controller)** pattern (or rather, Model-Route-Controller in the context of an API).
- **Express.js** handles the HTTP requests and routing.
- **Mongoose** connects to MongoDB and defines data schemas.
- **Controllers** contain the request handling logic.

## Directory Structure

```
workout-backend/
├── config/           # Configuration files (Database connection, etc.)
├── controllers/      # Request handlers (Logic for routes)
├── models/           # Mongoose Data Schemas (DB structure)
├── routes/           # API Route Definitions (URL endpoints)
├── services/         # Business logic (Separated from controllers)
├── server.js         # Entry point of the application
├── package.json      # Dependencies and scripts
└── .env              # Environment variables (Git-ignored)
```

## Key Components

### 1. Entry Point (`server.js`)
The `server.js` file initializes the Express app, connects to the database, sets up middleware (like CORS), and defines the base routes.

### 2. Models (`models/`)
Defines the structure of the data. Key models include:
- `Exercise.js`: Structure for fitness exercises.
- `Split.js`: Configurations for workout splits.
- `User.js`: User data.
- `Workout.js` / `Session.js`: Tracking user activity.

### 3. Routes (`routes/`)
Maps HTTP endpoints to controller functions.
- `exerciseRoutes.js`: Endpoints starting with `/api/exercises`.
- `splitRoutes.js`: Endpoints starting with `/api/splits`.

### 4. Controllers (`controllers/`)
Logic for handling requests. For example, extracting query parameters, calling DB methods, and sending responses.
- `exerciseController.js`: Logic for fetching and filtering exercises.

### 5. Services (`services/`)
Contains reusable business logic that can be shared across controllers or used to keep controllers lean.

## Data Flow

1. **Request**: A client sends a request (e.g., `GET /api/splits/recommend?goal=strength`).
2. **Route**: Express matches the URL in `routes/splitRoutes.js`.
3. **Controller**: The route calls the corresponding handler (e.g., `exerciseController` or inline handler in route).
4. **Model**: The controller interacts with Mongoose Models (e.g., `Split.find(...)`) to query MongoDB.
5. **Response**: The data is processed (e.g., scored/ranked) and sent back as JSON.
