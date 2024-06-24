const mongoose = require("mongoose");
const applybetSchema = new mongoose.Schema(
  {
    round: {
      type: Number,
      default: 0,
    },
    multiplier: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // This option automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model("gamehistory", applybetSchema);
