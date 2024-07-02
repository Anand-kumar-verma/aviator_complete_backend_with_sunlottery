const { io } = require("../config/socket");
const AdminWallet = require("../models/AdminWallet");
const ApplyBetLedger = require("../models/ApplyBetLedger");
const GameHistory = require("../models/GameHistory");
const LossTable = require("../models/LossTable");
const User = require("../models/User");
const applyBet = require("../models/applyBet");

require("dotenv").config();

exports.createUser = async (req, res) => {
  try {
    const { userid, username, password } = req.body;
    const obj = new User({
      userid,
      username,
      password,
    });
    const isAlreadyExist = await User.findOne({ userid: userid });
    if (isAlreadyExist) {
      return res.status(200).json({
        msg: "Login Successfully",
        data: isAlreadyExist,
        error: "200",
      });
    }

    const response = await obj.save();
    return res.status(200).json({
      msg: "Data save successfully",
      data: response,
      error: "200",
    });
  } catch (e) {
    res.status(500).json({
      msg: "Something went wrong in create user query",
    });
  }
};

// exports.applybetFunction = async (req, res) => {
//   try {
//     const { userid, id, amount } = req.body;
//     if (!userid || !id || !amount)
//       return res.status(403).json({
//         msg: "All field is required",
//       });

//     const round = await GameRound?.find({});
//     const obj = new applyBet({
//       userid: String(id),
//       amount,
//       round: round?.[0]?.round,
//     });
//     const user = await User.findOne({ _id: userid });
//     const newamount = await User.findByIdAndUpdate(
//       { _id: userid },
//       { wallet: user.wallet - amount }
//     );
//     const response = await obj.save();
//     io.emit("apply_bet_counter",response)
//     ///////// update admin wallet //////////////////////////////////
//     const admin_wallet = await AdminWallet.find({});
//     const firstElement = admin_wallet?.[0];
//     await AdminWallet.findByIdAndUpdate(
//       { _id: firstElement._id },
//       { wallet: Number(firstElement.wallet || 0) + Number(amount || 0) }
//     );

//     ////////////////// revert the final response
//     return res.status(200).json({
//       msg: "Data save successfully",
//       data: response,
//       newamount: newamount,
//     });
//   } catch (e) {
//     res.status(500).json({
//       msg: "Something went wrong in create user query",
//     });
//   }
// };

// exports.cashOutFunction = async (req, res) => {
//   try {
//     const { userid, id, amount, multiplier } = req.body;
//     if (!userid || !id || !amount || !multiplier)
//       return res.status(403).json({
//         msg: "All field is required",
//       });

//     const round = await GameRound?.find({});
//     // const obj = new applyBet({
//     //   userid,
//     //   amount,
//     //   multiplier,
//     // });
//     const user = await User.findOne({ _id: userid });
//     const newamount = await User.findByIdAndUpdate(
//       { _id: userid },
//       { wallet: user.wallet + amount }
//     );
//     const response = await applyBet.findOneAndUpdate(
//       { userid: id, round: round?.[0]?.round },
//       { amountcashed: amount, multiplier: multiplier }
//     );
//     io.emit("cash_out_counter",response)
//     // const response = await obj.save();
//     ///////// update admin wallet //////////////////////////////////
//     const admin_wallet = await AdminWallet.find({});
//     const firstElement = admin_wallet?.[0];
//     await AdminWallet.findByIdAndUpdate(
//       { _id: firstElement._id },
//       { wallet: Number(firstElement.wallet || 0) - Number(amount || 0) }
//     );

//     ////////////////// revert the final response
//     return res.status(200).json({
//       msg: "Data save successfully",
//       data: response,
//       newamount: newamount,
//     });
//   } catch (e) {
//     console.log(e);
//     return res.status(500).json({
//       msg: "Something went wrong in create user query",
//     });
//   }
// };

exports.adminWalletFunction = async (req, res) => {
  try {
    const { wallet } = req.body;
    const obj = new AdminWallet({
      wallet,
    });

    const response = await obj.save();

    return res.status(200).json({
      msg: "Data save successfully",
      data: response,
    });
  } catch (e) {
    return res.status(500).json({
      msg: "Something went wrong in create user query",
    });
  }
};
exports.getTopRecordsAviator = async (req, res) => {
  try {
    const data = await ApplyBetLedger.find({})
      .sort({ amountcashed: -1 })
      .populate("main_id")
      .limit(10);
    return res.status(200).json({
      msg: "Data save successfully",
      data: data,
    });
  } catch (e) {
    return res.status(500).json({
      msg: "Something went wrong in create user query",
    });
  }
};

exports.userLoginFunctoin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const isFindUser = await User.findOne({ email: email });
    if (!isFindUser)
      return res.status(400).json({
        msg: "User not found",
      });
    if (isFindUser?.password !== password)
      return res.status(400).json({
        msg: "Wrong Password",
      });
    res.status(200).json({
      msg: "Data save successfully",
      data: isFindUser,
    });
  } catch (e) {
    res.status(500).json({
      msg: "Something went wrong in create user query",
    });
  }
};

exports.totalBetAmount = async () => {
  try {
    const response = await applyBet
      .aggregate([
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ])
      .then((result) => {
        const totalSum = result.length > 0 ? result[0].totalAmount : 0;

        console.log(totalSum);
        return totalSum || 0;
      })
      .catch((err) => {
        console.error(err);
      });
  } catch (e) {
    console.log(e);
  }
};

exports.lossAmountFunction = async (req, res) => {
  try {
    const { lossAmount } = req.body;
    const obj = new LossTable({
      lossAmount,
    });
    const response = await obj.save();
    res.status(200).json({
      msg: "Data save successfully",
      data: response,
    });
  } catch (e) {
    res.status(500).json({
      msg: "Something went wrong in create user query",
    });
  }
};

exports.getWalletByUserId = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id)
      return res.status(400).json({
        msg: "Undefined uesr id",
      });
    const data = await User.findById({ _id: id });

    if (!data)
      return res.status(400).json({
        msg: "User not found",
      });
    return res.status(200).json({
      data: data,
      msg: "Data fetched successfully",
    });
  } catch (e) {
    console.log(e);
  }
};

exports.getGameHistory = async (req, res) => {
  try {
    const data = await GameHistory.find({});

    if (!data)
      return res.status(400).json({
        msg: "Data not found",
      });
    return res.status(200).json({
      data: data,
      msg: "Data fetched successfully",
    });
  } catch (e) {
    console.log(e);
  }
};

exports.getMyHistoryByID = async (req, res) => {
  try {
    const { user_id_node } = req.body;
    if (!user_id_node)
      return res.status(400).json({
        msg: "Please provider user id",
      });
    const data = await ApplyBetLedger.find({ userid: String(user_id_node) });

    if (!data)
      return res.status(400).json({
        msg: "Data not found",
      });
    return res.status(200).json({
      data: data,
      msg: "Data fetched successfully",
    });
  } catch (e) {
    console.log(e);
  }
};

exports.getAviatorWalletAmountAdmin = async (req, res) => {
  try {
    const data = await AdminWallet.find({});

    if (!data)
      return res.status(400).json({
        msg: "Data not found",
      });
    return res.status(200).json({
      data: data,
      msg: "Data fetched successfully",
    });
  } catch (e) {
    console.log(e);
  }
};

exports.getLederData = async (req, res) => {
  try {
    const data = await ApplyBetLedger.find({}).populate("main_id").limit(100);
    if (!data)
      return res.status(400).json({
        msg: "Data not found",
      });
    return res.status(200).json({
      data: data,
      msg: "Data fetched successfully",
    });
  } catch (e) {
    console.log(e);
  }
};
