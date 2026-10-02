# ASCENT-Backend

Express 5 + Mongoose 9 (CommonJS) API for the ASCENT app (`../ASCENT-Frontend`). Mostly serves the community features: auth, friends, posts with photos/videos, kudos, comments, clubs, weekly leaderboards, notifications. Older `/api/sync/*`, `/api/exercises`, `/api/splits` routes predate the offline-first app and are currently unused by it.

## Commands

- `npm test` — `node --test test/*.test.js` against an in-memory MongoDB (`mongodb-memory-server`, downloads a mongod binary on first run). No real DB needed.
- `npm run dev` (nodemon) / `npm start` — needs `.env` with `MONGO_URI` and `JWT_SECRET` (≥ 32 chars); see `.env.example`. `config/env.js` fails fast if missing.

## Layout

- `app.js` builds the Express app (exported for tests); `server.js` loads env, connects Mongo, listens (default port 5000).
- `routes/*Routes.js` — one router per resource; validate bodies with zod via `middleware/validate.js`; auth via `middleware/authMiddleware.js` (`Authorization: Bearer <jwt>`, sets `req.userId`).
- `services/social.js` — friend/club lookups, `canSee(post, userId)` visibility rule, signed media links, `serializePost`, `notify`.
- `services/media.js` — GridFS bucket `media`. Uploads stream raw bodies (`POST /api/posts/:id/media`, Content-Type image/* or video/*); downloads support HTTP Range (needed for iOS video).

## Rules

- Privacy first: a post is visible to its owner, to accepted friends unless `visibility: "private"`, and to members of clubs it was shared to. Every read path must go through `canSee` or an equivalent query; return 404 (not 403) for posts the caller can't see.
- Only the owner edits/deletes a post; post owners may delete any comment on their post.
- Media URLs are HMAC-signed and expire in 24 h — never expose raw `/api/media/:id` without a signature.
- Account deletion (`DELETE /api/auth/me`) must remove everything the user created, including GridFS files. Extend it when adding new models.
- Add a test in `test/` for every new endpoint, including the "stranger can't see/do it" case.
