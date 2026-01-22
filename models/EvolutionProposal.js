const mongoose = require("mongoose");

const evolutionProposalSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workout",
        required: true
    },

    confidenceScore: Number,

    evolutionLogId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EvolutionLog"
    },

    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending"
    },

    rejectionReason: String,

    createdAt: {
        type: Date,
        default: Date.now
    },

    resolvedAt: Date
});

module.exports = mongoose.model(
    "EvolutionProposal",
    evolutionProposalSchema
);
