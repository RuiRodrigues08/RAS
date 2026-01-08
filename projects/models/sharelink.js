const mongoose = require("mongoose");

const shareLinkSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "project",
  },
  permission: {
    type: String,
    enum: ["VIEWER", "EDITOR"],
    default: "VIEWER",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

shareLinkSchema.index({ token: 1 });

module.exports = mongoose.model("sharelink", shareLinkSchema);
