const mongoose = require("mongoose");
const adminWalletSchema = new mongoose.Schema(
  {
    wallet: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // This option automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model("AdminWallet", adminWalletSchema);
