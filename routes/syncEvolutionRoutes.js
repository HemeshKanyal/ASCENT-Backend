const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const EvolutionLog = require("../models/EvolutionLog");
const EvolutionProposal = require("../models/EvolutionProposal");

/**
 * PUSH evolution logs
 */
router.post("/logs/push", auth, async (req, res) => {
    const { logs } = req.body;

    if (!Array.isArray(logs)) {
        return res.status(400).json({ message: "Invalid payload" });
    }

    let saved = 0;

    for (const log of logs) {
        const exists = await EvolutionLog.findOne({
            userId: req.userId,
            templateId: log.templateId,
            fromVersion: log.fromVersion,
            toVersion: log.toVersion
        });

        if (!exists) {
            await EvolutionLog.create({
                ...log,
                userId: req.userId
            });
            saved++;
        }
    }

    res.json({ savedCount: saved });
});

/**
 * PULL evolution logs
 */
router.get("/logs/pull", auth, async (req, res) => {
    const logs = await EvolutionLog.find({
        userId: req.userId
    }).sort({ createdAt: -1 });

    res.json(logs);
});

/**
 * PUSH evolution proposals
 */
router.post("/proposals/push", auth, async (req, res) => {
    const { proposals } = req.body;

    if (!Array.isArray(proposals)) {
        return res.status(400).json({ message: "Invalid payload" });
    }

    let saved = 0;

    for (const proposal of proposals) {
        const exists = await EvolutionProposal.findOne({
            userId: req.userId,
            evolutionLogId: proposal.evolutionLogId
        });

        if (!exists) {
            await EvolutionProposal.create({
                ...proposal,
                userId: req.userId
            });
            saved++;
        }
    }

    res.json({ savedCount: saved });
});

/**
 * PULL evolution proposals
 */
router.get("/proposals/pull", auth, async (req, res) => {
    const proposals = await EvolutionProposal.find({
        userId: req.userId
    }).sort({ createdAt: -1 });

    res.json(proposals);
});

module.exports = router;
