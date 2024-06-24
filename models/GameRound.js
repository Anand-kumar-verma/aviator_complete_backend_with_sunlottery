const mongoose = require("mongoose");
const setCounterSchema = new mongoose.Schema(
  {
    round: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // This option automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model("gameRound", setCounterSchema);
