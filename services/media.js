const mongoose = require("mongoose");

let bucket;
/** GridFS keeps photos and clips in MongoDB itself — fine for a small group of friends. */
function mediaBucket() {
  if (!bucket || bucket.s?.db !== mongoose.connection.db) {
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "media" });
  }
  return bucket;
}

async function deleteFiles(ids) {
  for (const id of ids) {
    try {
      await mediaBucket().delete(new mongoose.Types.ObjectId(String(id)));
    } catch {
      // Already gone.
    }
  }
}

module.exports = { mediaBucket, deleteFiles };
