const mongoose = require("mongoose");

const evolutionLogSchema = new mongoose.Schema({
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

    fromVersion: Number,
    toVersion: Number,

    changes: [
        {
            exerciseId: String,
            field: String,
            before: mongoose.Schema.Types.Mixed,
            after: mongoose.Schema.Types.Mixed,
            reason: String
        }
    ],

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("EvolutionLog", evolutionLogSchema);
