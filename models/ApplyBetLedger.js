const mongoose = require("mongoose");
const applybetSchema = new mongoose.Schema(
  {
    main_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user"
    },
    userid: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    amountcashed: {
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

module.exports = mongoose.model("ApplyBetLedger", applybetSchema);
