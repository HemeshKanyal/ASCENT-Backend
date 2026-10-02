const express = require("express");
const mongoose = require("mongoose");

const { mediaBucket } = require("../services/media");
const { isId, verifyMedia } = require("../services/social");

const router = express.Router();

/** Signed links only (see services/social.js). Supports Range so phones can stream video. */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!isId(id) || !verifyMedia(id, req.query.exp, req.query.sig)) return res.status(403).json({ message: "Link expired" });
  const [file] = await mediaBucket().find({ _id: new mongoose.Types.ObjectId(id) }).toArray();
  if (!file) return res.status(404).end();

  const type = file.metadata?.mimeType || "application/octet-stream";
  const total = file.length;
  res.set({ "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=86400" });

  const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ""));
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
    if (start >= total || start > end) {
      res.set("Content-Range", `bytes */${total}`);
      return res.status(416).end();
    }
    res.status(206).set({ "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(end - start + 1) });
    return mediaBucket().openDownloadStream(file._id, { start, end: end + 1 }).on("error", () => res.end()).pipe(res);
  }
  res.set("Content-Length", String(total));
  mediaBucket().openDownloadStream(file._id).on("error", () => res.end()).pipe(res);
});

module.exports = router;
