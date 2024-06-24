const mongoose = require("mongoose");

const LossTableSchema = new mongoose.Schema(
  {
    lossAmount: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now, // Default value set to the current date and time
    },
    updatedAt: {
      type: Date,
      default: Date.now, // Default value set to the current date and time
      index: true, // Index for faster querying
    },
  },
  {
    timestamps: true, // This option automatically adds createdAt and updatedAt fields
  }
);
LossTableSchema.index({ lossAmount: -1 });

module.exports = mongoose.model("LossTable", LossTableSchema);
