const express = require("express");
const { io, httpServer, app } = require("./config/socket");
const cors = require("cors");
const todoRoutes = require("./routes/todos");
require("dotenv").config();
const soment = require("moment-timezone");
const schedule = require("node-schedule");
const axios = require("axios");
const mysql = require("mysql");
const SetCounter = require("./models/SetCounter");
const moment = require("moment");
const LossTable = require("./models/LossTable");
const ApplyBetLedger = require("./models/ApplyBetLedger");
const User = require("./models/User");
const AdminWallet = require("./models/AdminWallet");
const GameHistory = require("./models/GameHistory");
require("./config/database").connect();

// const io = new Server(httpServer, {
//   cors: {
//     origin: "*",
//     credentials: true,
//     optionSuccessStatus: 200,
//   },
// });

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

// Create the connection pool
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE_URL,
  multipleStatements: true,
  connectTimeout: 10000,
});

// Event listener for new connections
pool.on("connection", function (_conn) {
  if (_conn) {
    console.log(`Connected to the database via threadId ${_conn.threadId}!!`);
    _conn.query("SET SESSION auto_increment_increment=1");
  }
});

app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 4000;
let bet_data = [];
app.use("/api/v1", todoRoutes);

// Schedule the function to run daily at 12:00 AM 0 0 * * *
const job = schedule.scheduleJob("0 1 * * *", async function () {
  try {
    // Make the API call using axios
    const response = await axios.get(
      "https://admin.sunlottery.fun/api/wallet-income"
    );
    response &&
      setTimeout(async () => {
        try {
          await axios.get("https://admin.sunlottery.fun/api/bet-income");
        } catch (e) {
          console.log(e);
        }
      }, 1000);
    response &&
      setTimeout(async () => {
        try {
          await axios.get("https://admin.sunlottery.fun/api/direct-income");
        } catch (e) {
          console.log(e);
        }
      }, 3000);
  } catch (error) {
    console.error("Error:", error.message);
  }
});

//////////////////////////////// promotion page data ///////////////////////////////////
app.get("/api/v1/promotiondata", async (req, res) => {
  pool.getConnection((err, con) => {
    if (err) {
      con.release();
      console.error("Error getting database connection: ", err);
      return res.status(500).json({
        msg: `Something went wrong ${err}`,
      });
    }
    const { id } = req.query;
    if (!id || isNaN(id)) {
      con.release();
      return res.status(400).json({
        message: "Id is missing or invalid",
      });
    }

    try {
      con.query("SELECT * FROM user", (err, result) => {
        if (err) {
          console.error(err);
          con.release();
          return res.status(500).json({
            msg: "Error in data fetching",
            error: err.message,
            er: err,
          });
        }

        const array = result.map((i) => ({
          ...i,
          count: 0,
          teamcount: 0,
          directReferrals: [],
        }));

        let new_data = updateReferralCountnew(array).find((i) => i.id == id);
        const levels = Array.from({ length: 20 }, (_, i) => `level_${i + 1}`);

        let direct_ids = new_data.directReferrals?.map((i) => i?.c_id);

        let indirect_ids = [];
        for (let i = levels.length - 1; i >= 0; i--) {
          let currentLevel = new_data?.teamMembersByLevel[levels[i - 1]];
          let nextLevel = new_data?.teamMembersByLevel[levels[i]];

          if (currentLevel && nextLevel) {
            let idsToRemove = currentLevel.map((item) => item.id);
            nextLevel = nextLevel.filter(
              (item) => !idsToRemove.includes(item.id)
            );
            new_data.teamMembersByLevel[levels[i]] = nextLevel;
          }
        }

        for (let i = 1; i <= 20; i++) {
          if (new_data.teamMembersByLevel[`level_${i}`]?.length > 0) {
            indirect_ids.push(
              ...new_data.teamMembersByLevel[`level_${i}`].map(
                (item) => item.id
              )
            );
          }
        }

        new_data = { ...new_data, deposit_member_amount: [] };

        const promises = [];
        for (let i = 1; i <= 20; i++) {
          if (new_data.teamMembersByLevel[`level_${i}`]?.length > 0) {
            let levelIds = new_data.teamMembersByLevel[`level_${i}`].map(
              (k) => k.id
            );
            const promise = new Promise((resolve, reject) => {
              con.query(
                `SELECT SUM(tr15_amt) AS total_amount,count(*) AS total_member FROM tr15_fund_request WHERE tr15_status = 'Success' AND tr15_depo_type = 'Winzo' AND tr15_uid IN (${levelIds.join(
                  ","
                )});`,
                (err, resultteamamount) => {
                  if (err) {
                    con.release();
                    console.error(err);
                    reject(err);
                  } else {
                    resolve(resultteamamount[0].total_amount || 0);
                  }
                }
              );
            });
            promises.push(promise);
          } else {
            promises.push(0);
          }
        }

        Promise.all(promises)
          .then((deposit_member_amounts) => {
            new_data.deposit_member_amount = deposit_member_amounts;
            con.query(
              `SELECT SUM(tr15_amt) AS total_amount,COUNT(DISTINCT tr15_uid) AS total_member FROM tr15_fund_request WHERE tr15_status = 'Success' AND tr15_depo_type = 'Winzo' AND tr15_uid IN (${direct_ids.join(
                ","
              )});`,
              (err, result) => {
                if (err) {
                  con.release();
                  console.error(err);
                  return res.status(500).json({
                    msg: "Error in data fetching",
                    error: err.message,
                    er: err,
                  });
                }

                con.query(
                  `SELECT SUM(tr15_amt) AS total_amount,COUNT(DISTINCT tr15_uid) AS total_member FROM tr15_fund_request WHERE tr15_status = 'Success' AND tr15_depo_type = 'Winzo' AND tr15_uid IN (${indirect_ids.join(
                    ","
                  )});`,
                  (err, resultteam) => {
                    if (err) {
                      console.error(err);
                      return res.status(500).json({
                        msg: "Error in data fetching",
                        error: err.message,
                        er: err,
                      });
                    }
                    con.release();
                    return res.status(200).json({
                      data: {
                        ...new_data,
                        deposit_member: result[0].total_member || 0,
                        deposit_recharge: result[0].total_amount || 0,
                        deposit_member_team: resultteam[0].total_member || 0,
                        deposit_recharge_team: resultteam[0].total_amount || 0,
                      },
                      msg: "Data fetched successfully",
                    });
                  }
                );
              }
            );
          })
          .catch((err) => {
            console.error(err);
            con.release();
            return res.status(500).json({
              msg: "Error in data fetching",
              error: err.message,
              er: err,
            });
          });
      });
    } catch (e) {
      con.release();
      console.error(e);
      return res.status(500).json({
        msg: "Error in data fetching",
        error: e.message,
      });
    }
  });
});

function updateReferralCountnew(users) {
  const countMap = {};
  const teamCountMap = {};

  // Initialize count for each user
  users.forEach((user) => {
    countMap[user.id] = 0;
    teamCountMap[user.id] = 0;
    user.directReferrals = []; // Initialize directReferrals array for each user
  });

  // Update count for each referral used
  users.forEach((user) => {
    // Check if referral_user_id exists in countMap
    if (countMap.hasOwnProperty(user.referral_user_id)) {
      // Increase the count for the referral_user_id by 1
      countMap[user.referral_user_id]++;
    }
  });

  // Update team count, deposit_member, and deposit_member_team count for each user recursively
  const updateTeamCountRecursively = (user) => {
    let totalChildrenCount = 0;

    // Check if the user id exists in countMap
    if (countMap.hasOwnProperty(user.id)) {
      totalChildrenCount += countMap[user.id];

      // Iterate through each user
      users.forEach((u) => {
        // Check if the user's referral_user_id matches the current user's id
        if (u.referral_user_id === user.id) {
          // Check if the user's referral_user_id is not null
          if (user.referral_user_id !== null) {
            // Check if the directReferrals array does not already contain the current user
            if (
              !user.directReferrals.some((referral) => referral.c_id === u.id)
            ) {
              // If not, add the user to the directReferrals array
              user.directReferrals.push({
                user_name: u.full_name,
                mobile: u.mobile,
                c_id: u.id,
                id: u.username,
              });
            }
          }
          // Recursively update the team count for the current user
          totalChildrenCount += updateTeamCountRecursively(u);
        }
      });
    }

    return totalChildrenCount;
  };

  users.forEach((user) => {
    // Update teamCountMap if user.id exists in countMap
    if (countMap.hasOwnProperty(user.id)) {
      teamCountMap[user.id] = updateTeamCountRecursively(user);
    }

    // Add direct referral to the user's directReferrals array
  });

  const updateUserLevelRecursively = (user, level, maxLevel) => {
    if (level === 0 || level > maxLevel) return []; // Return an empty array if we reached the desired level or exceeded the maximum level

    const levelMembers = [];

    // Iterate through each user
    users.forEach((u) => {
      // Check if the user's referral_user_id matches the current user's id
      if (u.referral_user_id === user.id) {
        // Add the user's full_name and id to the levelMembers array
        levelMembers.push({ full_name: u.full_name, id: u.id });

        // Recursively update the team members for the current user at the next level
        const children = updateUserLevelRecursively(u, level + 1, maxLevel); // Increase level for the next level
        levelMembers.push(...children); // Concatenate children to the current levelMembers array
      }
    });

    return levelMembers;
  };

  users.forEach((user) => {
    // Initialize arrays for each level of team members
    user.teamMembersByLevel = {};

    // Populate arrays with team members at each level
    for (let i = 1; i <= 20; i++) {
      const levelMembers = updateUserLevelRecursively(user, 1, i); // Start from level 1 and set the maximum level for this user
      user.teamMembersByLevel[`level_${i}`] = levelMembers;
      if (levelMembers.length === 0) break; // Stop populating arrays if no team members at this level
    }
  });
  // Assign counts to each user
  users.forEach((user) => {
    // Update user properties with countMap, teamCountMap, depositMemberMap, depositMemberTeamMap,
    // depositRechargeMap, and depositRechargeTeamMap if user.id exists in the respective maps
    user.count = countMap.hasOwnProperty(user.id) ? countMap[user.id] : 0;
    user.teamcount = teamCountMap.hasOwnProperty(user.id)
      ? teamCountMap[user.id]
      : 0;
  });
  return users;
}

app.get("/api/v1/topw11winningInformation", async (req, res) => {
  pool.getConnection((err, con) => {
    if (err) {
      con.release();
      console.error("Error getting database connection: ", err);
      return res.status(500).json({
        msg: `Something went wrong ${err}`,
      });
    }
    try {
      con.query(
        "SELECT colour_bet.*, user.full_name, user.winning_wallet, user.email FROM colour_bet JOIN user ON colour_bet.userid = user.id ORDER BY CAST(colour_bet.win AS UNSIGNED) DESC LIMIT 11;",
        (err, result) => {
          if (err) {
            con.release();
            console.error(err);
            return res.status(500).json({
              msg: "Error in data fetching",
              error: err.message,
            });
          }
          con.release();
          if (result && result.length > 0) {
            return res.status(200).json({
              msg: "Data fetched successfully",
              data: result,
            });
          } else {
            return res.status(404).json({
              msg: "No data found",
            });
          }
        }
      );
    } catch (e) {
      con.release();
      console.error(e);
      return res.status(500).json({
        msg: "Error in data fetching",
        error: e.message,
      });
    }
  });
});

let boolean = false;
async function generateAndSendMessage(loss_amount, get_counter) {
  let timerInterval;
  let crashInterval;

  let counterboolean = true;
  let total_bet_candidate = 0;

  // await applyBet.deleteMany({})
  const time = Math.floor(100 + Math.random() * (900 - 100));
  console.log(time, "this is time to send to the uer or client");
  io.emit("message", time);
  io.emit("crash", false);
  let fly_time = 0;
  let milliseconds = 90;
  let seconds = 0;

  io.emit("setloder", false);
  io.emit("isFlying", true);

  /////////////////////////////////////////////////////////////////////// start main calculaton for cashs out ///////////////////////////

  ////////////////////////////// interval for timer //////////////////////////////////////////////

  timerInterval = setInterval(async () => {
    if (boolean) {
      clearInterval(timerInterval);
      clearInterval(crashInterval);
      clearInterval(timerInterval);
      clearInterval(crashInterval);
      thisFunctonMustBePerFormAfterCrash(Number(`${1}.${1}`), "no");
      return;
    }
    if (milliseconds === 100) {
      seconds += 1;
      milliseconds = 0;
    }

    io.emit("seconds", `${String(milliseconds).padStart(2, "0")}_${seconds}`);

    const newTime = fly_time + 1;
    if (newTime >= time) {
      clearInterval(timerInterval);
      clearInterval(crashInterval);
      clearInterval(timerInterval);
      clearInterval(crashInterval);
      thisFunctonMustBePerFormAfterCrash(
        Number(`${seconds}.${milliseconds}`),
        "pre"
      );
      return;
    }

    milliseconds += 1;
    fly_time = newTime;
  }, 100);

  ///////////////////////////////////// thsi is the calculation of total cashout sum
  let bet_sum = 0;
  crashInterval = setInterval(async () => {
    //////////////////////get counter         ////////////////////////////////////////////

    /// calculation for apply all bets summesion////////////////////////////

    ///////////////////////////////
    bet_sum = bet_data?.reduce((a, b) => a + b.amount, 0);
    total_bet_candidate = bet_data?.length;

    const cash_out_sum = bet_data?.reduce((a, b) => a + b?.amountcashed, 0);
    const total_amount_ka_60_percent = bet_sum * (60 / 100); /// 60 percent se upar jayega to crash kra dena hai

    /////////////////// condition for loss amount //////////////////////////

    if (loss_amount !== 0 && bet_sum !== 0) {
      if (get_counter >= 3) {
        clearInterval(timerInterval);
        clearInterval(crashInterval);
        clearInterval(timerInterval);
        clearInterval(crashInterval);
        // this_is_recusive_function_for_remove_all_lossAmount_if_counter_greater_than_3(
        //   bet_sum
        // );
        thisFunctonMustBePerFormAfterCrash(
          Number(`${seconds}.${milliseconds}`),
          "counter_jyada_ho_chuka_hai"
        );
        return;
      } else if (loss_amount <= bet_sum) {
        counterboolean = false;
        clearInterval(timerInterval);
        clearInterval(crashInterval);
        clearInterval(timerInterval);
        clearInterval(crashInterval);
        thisFunctonMustBePerFormAfterCrash(
          Number(`${seconds}.${milliseconds}`),
          "remove_all_loss_and_set_counter_to_zero"
        );
        return;
      } else {
        const percent_60_bet_amount = bet_sum * (100 / 60);
        const find_any_loss_amount_match_with_60_percent =
          await LossTable.aggregate([
            {
              $sort: { lossAmount: -1 }, // Sort by lossAmount in descending order
            },
            {
              $match: { lossAmount: { $lte: percent_60_bet_amount } }, // Match the criteria
            },
            {
              $limit: 1, // Limit the result to the first document
            },
          ]); ///////// yha se vo lossAmount aa jayega jo ki 60% of bet_amount ko veriy kre..
        if (
          find_any_loss_amount_match_with_60_percent?.[0] &&
          find_any_loss_amount_match_with_60_percent?.[0]?.lossAmount > bet_sum
        ) {
          clearInterval(timerInterval);
          clearInterval(crashInterval);
          clearInterval(timerInterval);
          clearInterval(crashInterval);

          const remaining_amount =
            find_any_loss_amount_match_with_60_percent?.[0]?.lossAmount -
            bet_sum;

          if (
            remaining_amount > 0 &&
            find_any_loss_amount_match_with_60_percent?.[0]
          ) {
            thisFunctonMustBePerFormAfterCrash(
              Number(`${seconds}.${milliseconds}`),
              "loss_if_loss_jyada_hai_bet_amount_se_aur_60_percent_se_koi_match_bhi_kiya_hai",
              find_any_loss_amount_match_with_60_percent
            );
            return;
          }
        } else {
          /////////////////// means bet_amount jyada hai ////////////////////
          if (find_any_loss_amount_match_with_60_percent?.[0]) {
            clearInterval(timerInterval);
            clearInterval(crashInterval);
            clearInterval(timerInterval);
            clearInterval(crashInterval);

            thisFunctonMustBePerFormAfterCrash(
              Number(`${seconds}.${milliseconds}`),
              "recursive_functoin_for_all_removel_amount"
            );
            return;
          } else {
            if (bet_sum > 0 && counterboolean && cash_out_sum > 0) {
              await SetCounter.findOneAndUpdate(
                {},
                { $inc: { counter: 1 } },
                { new: true, upsert: true }
              );
              counterboolean = false;
            }
          }
        }
      }
    }

    ///////////////////////////////////// thsi is the calculation of total cashout sum

    /////////// conditoin for that if total amount is grater or equal that 500 Rs. creash ////////////////////
    if (total_bet_candidate <= 5 && bet_sum >= 500) {
      clearInterval(timerInterval);
      clearInterval(crashInterval);
      clearInterval(timerInterval);
      clearInterval(crashInterval);
      thisFunctonMustBePerFormAfterCrash(Number(`${seconds}.${milliseconds}`));
      return;
    }
    ////////////////////// conndition is that means agar cashout 60% se jyada huaa to crash kra do///////////////
    if (cash_out_sum > total_amount_ka_60_percent) {
      console.log("Function is called now 60 percent se jyada");
      clearInterval(timerInterval);
      clearInterval(crashInterval);
      clearInterval(timerInterval);
      clearInterval(crashInterval);
      counterboolean = false;
      ///////////////// this is the condition that means if cashout is grater than //////////////////////
      if (cash_out_sum > bet_sum) {
        clearInterval(timerInterval);
        clearInterval(crashInterval);
        clearInterval(timerInterval);
        clearInterval(crashInterval);
        thisFunctonMustBePerFormAfterCrash(
          Number(`${seconds}.${milliseconds}`),
          "sixty_percent_se_jyada_ka_crash"
        );
        return;
      } else if (cash_out_sum < bet_sum) {
        clearInterval(timerInterval);
        clearInterval(crashInterval);
        clearInterval(timerInterval);
        clearInterval(crashInterval);
        thisFunctonMustBePerFormAfterCrash(
          Number(`${seconds}.${milliseconds}`),
          "null"
        );
        return;
      }
      ///////////////// this is the condition that means if cashout is grater than //////////////////////
    }
    //////////////////// agar bet lgi hui hai to  second 4 se jyada nhi hone chahiye (+1 krna pdega hmesa q ki ui me +1 karke dikhaya gya hai each and everything)
    if (bet_sum > 0) {
      if (Number(seconds >= 3)) {
        clearInterval(timerInterval);
        clearInterval(crashInterval);
        clearInterval(timerInterval);
        clearInterval(crashInterval);
        thisFunctonMustBePerFormAfterCrash(
          Number(`${seconds}.${milliseconds}`)
        );
        return;
      }
    }
  }, 500);

  async function this_is_recusive_function_for_remove_all_lossAmount(bet_sum) {
    const percent_60_bet_amount = bet_sum * (100 / 60);
    const find_any_loss_amount_match_with_60_percent =
      await LossTable.aggregate([
        {
          $sort: { lossAmount: -1 }, // Sort by lossAmount in descending order
        },
        {
          $match: { lossAmount: { $lte: percent_60_bet_amount } }, // Match the criteria
        },
        {
          $limit: 1, // Limit the result to the first document
        },
      ]);
    // this is the base case..
    if (!find_any_loss_amount_match_with_60_percent) return;
    if (
      find_any_loss_amount_match_with_60_percent?.[0] &&
      find_any_loss_amount_match_with_60_percent?.[0]?.lossAmount > bet_sum
    ) {
      clearInterval(timerInterval);
      clearInterval(crashInterval);
      clearInterval(timerInterval);
      clearInterval(crashInterval);

      const remaining_amount =
        find_any_loss_amount_match_with_60_percent?.[0]?.lossAmount - bet_sum;
      if (
        remaining_amount > 0 &&
        find_any_loss_amount_match_with_60_percent?.[0]
      ) {
        await LossTable.findByIdAndUpdate(
          { _id: find_any_loss_amount_match_with_60_percent?.[0]?._id },
          {
            lossAmount:
              find_any_loss_amount_match_with_60_percent?.[0]?.lossAmount -
              bet_sum,
          }
        );

        // thisFunctonMustBePerFormAfterCrash(
        //   Number(`${seconds + 1}.${milliseconds}`)
        // );
        return;
      }
    } else {
      if (find_any_loss_amount_match_with_60_percent?.[0]) {
        await LossTable.findByIdAndDelete({
          _id: find_any_loss_amount_match_with_60_percent?.[0]._id,
        });
        const total_value_bet_amount_which_is_grater_than_lossAmount =
          bet_sum - find_any_loss_amount_match_with_60_percent?.[0]?.lossAmount;
        if (total_value_bet_amount_which_is_grater_than_lossAmount > 0)
          this_is_recusive_function_for_remove_all_lossAmount(
            total_value_bet_amount_which_is_grater_than_lossAmount
          );
      }
    }
  }

  async function this_is_recusive_function_for_remove_all_lossAmount_if_counter_greater_than_3(
    bet_sum
  ) {
    console.log("Anand ji ka function call huaa", bet_sum);

    const find_any_loss_amount_match_with_60_percent =
      await LossTable.aggregate([
        {
          $sort: { lossAmount: -1 }, // Sort by lossAmount in descending order
        },
        {
          $limit: 1, // Limit the result to the first document
        },
      ]);

    // this is the base case..
    if (
      !find_any_loss_amount_match_with_60_percent ||
      find_any_loss_amount_match_with_60_percent.length <= 0
    ) {
      await SetCounter.findOneAndUpdate({}, { counter: 0 });
      return;
    }

    if (
      find_any_loss_amount_match_with_60_percent[0] &&
      find_any_loss_amount_match_with_60_percent[0].lossAmount > bet_sum
    ) {
      const remaining_amount =
        find_any_loss_amount_match_with_60_percent[0].lossAmount - bet_sum;

      if (remaining_amount > 0) {
        clearInterval(timerInterval);
        clearInterval(crashInterval);

        await LossTable.findByIdAndUpdate(
          { _id: find_any_loss_amount_match_with_60_percent[0]._id },
          {
            lossAmount: remaining_amount,
          }
        );

        return;
      }
    } else {
      if (find_any_loss_amount_match_with_60_percent[0]) {
        await LossTable.findByIdAndDelete({
          _id: find_any_loss_amount_match_with_60_percent[0]._id,
        });

        const total_value_bet_amount_which_is_greater_than_lossAmount =
          bet_sum - find_any_loss_amount_match_with_60_percent[0].lossAmount;

        if (total_value_bet_amount_which_is_greater_than_lossAmount > 0) {
          return this_is_recusive_function_for_remove_all_lossAmount_if_counter_greater_than_3(
            total_value_bet_amount_which_is_greater_than_lossAmount
          );
        }
      }
    }

    // Check if there are any remaining documents
    const remaining_documents = await LossTable.find({}).countDocuments();
    if (remaining_documents === 0) {
      await SetCounter.findOneAndUpdate({}, { counter: 0 });
    }
  }

  async function thisFunctonMustBePerFormAfterCrash(time, msg) {
    clearInterval(timerInterval);
    clearInterval(crashInterval);
    clearInterval(timerInterval);
    clearInterval(crashInterval);
    console.log("thisFunctonMustBePerFormAfterCrash HOOOOOOO crached");
    // const round = await GameRound?.find({});
    io.emit("crash", true);
    io.emit("isFlying", false);
    io.emit("setcolorofdigit", true);
    io.emit("apply_bet_counter", []);
    io.emit("cash_out_counter", []);

    if (msg === "counter_jyada_ho_chuka_hai") {
      let bet_sum = bet_data?.reduce((a, b) => a + b.amount, 0);
      this_is_recusive_function_for_remove_all_lossAmount_if_counter_greater_than_3(
        bet_sum
      );
    }
    if (
      msg ===
      "loss_if_loss_jyada_hai_bet_amount_se_aur_60_percent_se_koi_match_bhi_kiya_hai"
    ) {
      let bet_sum = bet_data?.reduce((a, b) => a + b.amount, 0);
      const percent_60_bet_amount = bet_sum * (100 / 60);
      const find_any_loss_amount_match_with_60_percent =
        await LossTable.aggregate([
          {
            $sort: { lossAmount: -1 }, // Sort by lossAmount in descending order
          },
          {
            $match: { lossAmount: { $lte: percent_60_bet_amount } }, // Match the criteria
          },
          {
            $limit: 1, // Limit the result to the first document
          },
        ]);

      await LossTable.findByIdAndUpdate(
        { _id: find_any_loss_amount_match_with_60_percent?.[0]?._id },
        {
          lossAmount:
            find_any_loss_amount_match_with_60_percent?.[0]?.lossAmount -
            bet_sum,
        }
      );
    }

    if (msg === "recursive_functoin_for_all_removel_amount") {
      let bet_sum = bet_data?.reduce((a, b) => a + b.amount, 0);
      const percent_60_bet_amount = bet_sum * (100 / 60);
      const find_any_loss_amount_match_with_60_percent =
        await LossTable.aggregate([
          {
            $sort: { lossAmount: -1 }, // Sort by lossAmount in descending order
          },
          {
            $match: { lossAmount: { $lte: percent_60_bet_amount } }, // Match the criteria
          },
          {
            $limit: 1, // Limit the result to the first document
          },
        ]);
      await LossTable.findByIdAndDelete({
        _id: find_any_loss_amount_match_with_60_percent?.[0]._id,
      });

      const total_value_bet_amount_which_is_grater_than_lossAmount =
        bet_sum - find_any_loss_amount_match_with_60_percent?.[0]?.lossAmount;

      this_is_recusive_function_for_remove_all_lossAmount(
        total_value_bet_amount_which_is_grater_than_lossAmount
      );
    }

    if (msg === "sixty_percent_se_jyada_ka_crash") {
      console.log("sixty_percent_se_jyada_ka_crash");
      const bet_sum = bet_data?.reduce((a, b) => a + b.amount, 0);
      const cash_out_sum = bet_data?.reduce((a, b) => a + b?.amountcashed, 0);
      const obj = new LossTable({
        lossAmount: cash_out_sum - bet_sum,
      });
      const response = await obj.save();
    }
    if (msg === "remove_all_loss_and_set_counter_to_zero") {
      await LossTable.deleteMany({});
      await SetCounter.findOneAndUpdate({}, { counter: 0 });
    }

    const obj = new GameHistory({
      round: 10000,
      multiplier: msg === "pre" ? time : time - 0.01,
    });
    const response = await obj.save();

    const saveBetLedgers = async (bet_data) => {
      const promises = bet_data.map(async (element) => {
        const obj = new ApplyBetLedger({
          main_id: element.userid,
          userid: element.id,
          amount: element.amount,
          amountcashed: element.amountcashed,
          multiplier: element.multiplier,
        });
        return obj.save();
      });
    
      // Wait for all save operations to complete
      await Promise.all(promises);
    };
    
    // Example usage:
    saveBetLedgers(bet_data).then(() => {
      console.log('All ApplyBetLedger objects saved successfully');
    }).catch(err => {
      console.error('Error saving ApplyBetLedger objects:', err);
    });

    setTimeout(() => {
      io.emit("setcolorofdigit", false);
      io.emit("setloder", true);
    }, 3000);
    let loss_amount = await LossTable.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$lossAmount" },
        },
      },
    ]).then((result) => {
      return result.length > 0 ? result[0].totalAmount : 0;
    });
    const set_counter = await SetCounter.find({});
    let get_counter = set_counter?.[0]?.counter || 0;

    const total_bet_sum = bet_data?.reduce((a, b) => a + b.amount, 0);
    const total_crashed_sum = bet_data?.reduce((a, b) => a + b.amountcashed, 0);
    const admin_wallet = await AdminWallet.find({}).limit(1);
    await AdminWallet.findByIdAndUpdate(
      { _id: admin_wallet?.[0]?._id },
      {
        wallet:
          admin_wallet?.[0]?.wallet +
          (Number(total_bet_sum) - Number(total_crashed_sum)),
      }
    );
    console.log(bet_data,"this is simple testing");

    // bet_data.forEach(async (element) => {
    //   const getuser = await User.findOne({ _id: element.userid });
    //   const response = await User.findByIdAndUpdate(
    //     { _id: getuser._id },
    //     {
    //       wallet:
    //         getuser.wallet +
    //         Number(
    //           element.amountcashed > 0
    //             ? element.amountcashed - element.amount
    //             : -element.amount
    //         ),
    //     }
    //   );
    // });
const updateUserWallets = async (bet_data) => {
  // Step 1: Group bet_data by userid and calculate the total wallet change for each user
  const userWalletChanges = bet_data.reduce((acc, element) => {
    const userId = element.userid;
    const amountChange = Number(element.amountcashed > 0 ? element.amountcashed - element.amount : -element.amount);

    if (!acc[userId]) {
      acc[userId] = 0;
    }
    acc[userId] += amountChange;
    return acc;
  }, {});

  // Step 2: Update each user once with the aggregated wallet change
  const updatePromises = Object.keys(userWalletChanges).map(async (userId) => {
    const getuser = await User.findOne({ _id: userId });
    if (getuser) {
      const newWalletAmount = getuser.wallet + userWalletChanges[userId];
      return User.findByIdAndUpdate(
        { _id: getuser._id },
        { wallet: newWalletAmount },
        { new: true }
      );
    }
  });

  // Step 3: Wait for all updates to complete
  await Promise.all(updatePromises);
};

// Example usage:
updateUserWallets(bet_data).then(() => {
  console.log('User wallets updated successfully');
}).catch(err => {
  console.error('Error updating user wallets:', err);
});

    setTimeout(() => {
      bet_data = [];
      msg !== "no" &&
        !boolean &&
        generateAndSendMessage(loss_amount, get_counter);
    }, 30000);
  }
}

////////////// testing api's ////////////////////////
app.post("/api/v1/apply-bet", async (req, res) => {
  try {
    const { userid, id, amount, button_type } = req.body;
    if (!userid || !id || !amount)
      return res.status(403).json({
        msg: "All field is required",
      });
    const new_data = {
      userid: userid,
      id: id,
      amount: amount,
      amountcashed: 0,
      multiplier: 0,
      button_type: button_type,
    };
    bet_data.push(new_data);
    // const user = await User.findOne({ _id: userid });
    // const newamount = await User.findByIdAndUpdate(
    //   { _id: userid },
    //   { wallet: user.wallet - amount }
    // );
    return res.status(200).json({
      msg: "Data save successfully",
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      msg: "Something went wrong in bet placing",
    });
  }
});

app.post("/api/v1/cash-out", async (req, res) => {
  try {
    const { userid, id, amount, multiplier, button_type } = req.body;
    if (!userid || !id || !amount || !multiplier || !button_type)
      return res.status(403).json({
        msg: "All field is required",
      });

    // const user = await User.findOne({ _id: userid });
    // const newamount = await User.findByIdAndUpdate(
    //   { _id: userid },
    //   { wallet: user.wallet + amount }
    // );

    bet_data.forEach((item) => {
      if (item.id === id && item.button_type === button_type) {
        item.amountcashed = amount;
        item.multiplier = multiplier;
      }
    });
    ////////////////// revert the final response
    return res.status(200).json({
      msg: "Data save successfully",
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      msg: "Something went wrong in create user query",
    });
  }
});

//////////////////////  ledger entry to be transfer into sql database /////////////////////////////////

// aviator band huaa 12 bje
schedule.scheduleJob("0 0 * * *", async function () {
  // generateAndSendMessage(24.00,"no");
  boolean = true;
  // generateAndSendMessage();
  start_aviator_closing();
});
// aviator start huaa 1 bje fir se
schedule.scheduleJob("0 1 * * *", async function () {
  boolean = false;
  let loss_amount = await LossTable.aggregate([
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$lossAmount" },
      },
    },
  ]).then((result) => {
    return result.length > 0 ? result[0].totalAmount : 0;
  });
  const set_counter = await SetCounter.find({});
  let get_counter = set_counter?.[0]?.counter || 0;
  generateAndSendMessage(loss_amount, get_counter);
});

////////// closing start in aviator //////////////////
async function start_aviator_closing() {
  ////////////////////    all entry trasnfer to the sql database /////////////////
  pool.getConnection(async (err, con) => {
    if (err) {
      con.release();
      console.error("Error getting database connection: ", err);
      return;
    }

    const data = await ApplyBetLedger.find({});

    data?.forEach(async (element) => {
      const insertQuery = `INSERT INTO aviator_ledger (round, userid, amount, amountcashed, multiplier, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?);`;

      const values = [
        element?.round,
        element?.userid,
        element?.amount,
        element?.amountcashed,
        element?.multiplier,
        element?.createdAt,
        element?.updatedAt,
      ];

      con.query(insertQuery, values, async (err, result) => {
        if (err) {
          console.error("Error executing insert query: ", err);
          return;
        }
        try {
          await ApplyBetLedger.deleteOne({ _id: element._id });
        } catch (deleteError) {
          console.error("Error deleting document: ", deleteError);
        }
      });
    });
    // backup of aviator crash
    const crashHistory = await GameHistory.find({});
    crashHistory?.forEach(async (element) => {
      const insertQuery = `INSERT INTO aviator_game_history (round, multiplier, createdAt, updatedAt) VALUES (?, ?, ?, ?);`;

      const values = [
        element?.round,
        element?.multiplier,
        element?.createdAt,
        element?.updatedAt,
      ];

      con.query(insertQuery, values, async (err, result) => {
        if (err) {
          console.error("Error executing insert query: ", err);
          return;
        }
        try {
          await GameHistory.deleteOne({ _id: element._id });
        } catch (deleteError) {
          console.error("Error deleting document: ", deleteError);
        }
      });
    });

    const adminwallet_amount = await AdminWallet.find({});
    if (adminwallet_amount) {
      const insertAdminWalletAmount =
        "INSERT INTO ledger_aviator_admin_wallet (net_amount,createdAt,updatedAt) VALUES (?, ?, ?);";
      const values = [
        adminwallet_amount?.[0]?.wallet,
        adminwallet_amount?.[0]?.createdAt,
        adminwallet_amount?.[0]?.updatedAt,
      ];
      con.query(insertAdminWalletAmount, values, async (err, result) => {
        if (err) {
          console.error("Error executing insert query: ", err);
          return;
        }
      });
    }
    con.release();
  });
}

////   main wallet to aviator wallet transfer ////
app.post("/main-wallet-to-aviator", async (req, res) => {
  pool.getConnection((err, con) => {
    if (err) {
      con.release();
      console.error("Error getting database connection: ", err);
      return res.status(500).json({
        msg: `Something went wrong ${err}`,
      });
    }
    //   //  // //   //   // main wallet amount to  aviator wallet ////////////
    const { user_id, amount } = req.body;
    if (!user_id || !amount) {
      con.release();
      return res.status(200).json({
        msg: `Please enter all data`,
      });
    }
    if (Number(amount) < 10) {
      con.release();
      return res.status(200).json({
        msg: `Please enter amount grater or equel to 10 Rs.`,
      });
    }
    const query = `SELECT wallet FROM user WHERE id = ${user_id};`;
    con.query(query, async (err, result) => {
      if (err) {
        con.release();
        return res.status(500).json({
          msg: `Something went wrong In database connecton ${err}`,
        });
      }
      const amount_real = result?.[0]?.wallet || 0;
      if (amount_real < amount) {
        con.release();
        return res.status(200).json({
          msg: `Wallet amount is not sufficient.`,
        });
      } else {
        const query = `UPDATE user SET wallet = ${
          Number(amount_real) - Number(amount)
        } WHERE id = ${user_id};`;

        con.query(query, (err, result) => {
          if (err) {
            con.release();
            return res.status(200).json({
              msg: `Wallet amount is not sufficient.`,
            });
          }
        });
        const get_node_user = await User.findOne({ userid: user_id });
        if (!get_node_user) {
          con.release();
          return res.status(500).json({
            msg: `Please login again user nod found for aviator`,
          });
        }
        const response = await User.findOneAndUpdate(
          { _id: get_node_user._id },
          { wallet: get_node_user?.wallet + Number(amount) }
        );
        con.release();
        return res.status(200).json({
          msg: `Transaction Successfully`,
          data: response,
        });
      }
    });
  });
});

////   aviator to main  wallet transfer ////
app.post("/aviator-to-main-wallet", async (req, res) => {
  pool.getConnection(async (err, con) => {
    if (err) {
      con.release();
      console.error("Error getting database connection: ", err);
      return res.status(500).json({
        msg: `Something went wrong ${err}`,
      });
    }
    //   //  // //   //   // main wallet amount to  aviator wallet ////////////
    const { user_id, amount } = req.body;
    if (!user_id || !amount) {
      con.release();
      return res.status(200).json({
        msg: `Please enter all data`,
      });
    }
    const get_node_user = await User.findOne({ userid: user_id });
    if (!get_node_user) {
      con?.release();
      return res.status(400).json({
        msg: `Please login again user nod found for aviator`,
      });
    }

    if (get_node_user?.wallet < Number(amount)) {
      con?.release();
      return res.status(200).json({
        msg: `Aviator wallet amount is low`,
      });
    }

    const query = `SELECT wallet FROM user WHERE id = ${user_id};`;
    con.query(query, async (err, result) => {
      if (err) {
        con?.release();
        return res.status(500).json({
          msg: `Something went wrong In database connecton ${err}`,
        });
      }
      if (result?.length <= 0) {
        con.release();
        return res.status(400).json({
          msg: `User not found`,
        });
      }
      const response = await User.findOneAndUpdate(
        { _id: get_node_user._id },
        { wallet: get_node_user?.wallet - Number(amount) }
      );
      if (response) {
        const query = `UPDATE user SET wallet = ${
          Number(result?.[0]?.wallet) + Number(amount)
        } WHERE id = ${user_id};`;

        con.query(query, (err, result) => {
          if (err) {
            con.release();
            return res.status(500).json({
              msg: `Something went wrong`,
            });
          }
          con.release();
          return res.status(200).json({
            msg: `Transaction Successfully`,
          });
        });
      }
    });
  });
});

///////// fund-transfer-to-main-aviator-wallet-from- sql-admin-wallet /////////////////////
app.post(
  "/fund-transfer-to-main-aviator-wallet-from-sql-main-admin-wallet",
  async (req, res) => {
    pool.getConnection(async (err, con) => {
      if (err) {
        con.release();
        console.error("Error getting database connection: ", err);
        return res.status(500).json({
          msg: `Something went wrong ${err}`,
        });
      }
      //   //  // //   //   // main wallet amount to  aviator wallet ////////////
      const { amount } = req.body;
      if (!amount) {
        con.release();
        return res.status(200).json({
          msg: `Please enter all data`,
        });
      }

      const query = `SELECT amount FROM aviator_admin_wallet WHERE id = 1;`;
      con.query(query, async (err, result) => {
        if (err) {
          con?.release();
          return res.status(500).json({
            msg: `Something went wrong In database connecton ${err}`,
          });
        }
        if (result?.length <= 0) {
          con.release();
          return res.status(400).json({
            msg: `User not found`,
          });
        }
        const main_admin_amount = result?.[0]?.amount;
        if (Number(main_admin_amount) < Number(amount)) {
          con.release();
          return res.status(200).json({
            msg: `Wallet Amount is low you have only Rs: ${main_admin_amount}`,
          });
        }

        const query = `UPDATE aviator_admin_wallet SET amount = ${
          Number(result?.[0]?.amount) - Number(amount)
        } WHERE id = 1;`;

        con.query(query, async (err, result) => {
          if (err) {
            con.release();
            return res.status(500).json({
              msg: `Something went wrong`,
            });
          }
          const getPreWalletAmount = await AdminWallet.find({});
          if (!getPreWalletAmount) {
            return res.status(500).json({
              msg: `Something went wrong in admin wallet in aviator`,
            });
          }
          const response = await AdminWallet.findByIdAndUpdate(
            { _id: getPreWalletAmount?.[0]?._id },
            {
              wallet:
                Number(getPreWalletAmount?.[0]?.wallet || 0) + Number(amount),
            }
          );
          con.release();
          return res.status(200).json({
            data: response,
            msg: `Transaction Successfully`,
          });
        });
      });
    });
  }
);

///////// fund-transfer-from-main-aviator-wallet-to- sql-admin-wallet /////////////////////

app.post(
  "/fund-transfer-from-main-aviator-wallet-to-sql-main-admin-wallet",
  async (req, res) => {
    pool.getConnection(async (err, con) => {
      if (err) {
        con.release();
        console.error("Error getting database connection: ", err);
        return res.status(500).json({
          msg: `Something went wrong ${err}`,
        });
      }
      //   //  // //   //   // main wallet amount to  aviator wallet ////////////
      const { amount } = req.body;
      if (!amount) {
        con.release();
        return res.status(200).json({
          msg: `Please enter all data`,
        });
      }
      const getPreWalletAmount = await AdminWallet.find({});
      if (!getPreWalletAmount) {
        return res.status(500).json({
          msg: `Something went wrong in admin wallet in aviator`,
        });
      }
      if (Number(getPreWalletAmount?.[0]?.wallet) < Number(amount))
        return res.status(200).json({
          msg: `Aviator wallet amount is low`,
        });

      const query = `SELECT amount FROM aviator_admin_wallet WHERE id = 1;`;
      con.query(query, async (err, result) => {
        if (err) {
          con?.release();
          return res.status(500).json({
            msg: `Something went wrong In database connecton ${err}`,
          });
        }
        if (result?.length <= 0) {
          con.release();
          return res.status(400).json({
            msg: `User not found`,
          });
        }
        const main_admin_amount = result?.[0]?.amount;

        const query = `UPDATE aviator_admin_wallet SET amount = ${
          Number(amount) + Number(main_admin_amount)
        } WHERE id = 1;`;

        con.query(query, async (err, result) => {
          if (err) {
            con.release();
            return res.status(500).json({
              msg: `Something went wrong`,
            });
          }
          const getPreWalletAmount = await AdminWallet.find({});
          if (!getPreWalletAmount) {
            return res.status(500).json({
              msg: `Something went wrong in admin wallet in aviator`,
            });
          }
          const response = await AdminWallet.findByIdAndUpdate(
            { _id: getPreWalletAmount?.[0]?._id },
            {
              wallet:
                Number(getPreWalletAmount?.[0]?.wallet || 0) - Number(amount),
            }
          );
          con.release();
          return res.status(200).json({
            data: response,
            msg: `Transaction Successfully`,
          });
        });
      });
    });
  }
);

///////// remaining wingo and trx timer /////////////////

// color prediction game time generated every 1 min
function generatedTimeEveryAfterEveryOneMin() {
  const job = schedule.scheduleJob("* * * * * *", function () {
    const currentTime = new Date();
    const timeToSend =
      currentTime.getSeconds() > 0
        ? 60 - currentTime.getSeconds()
        : currentTime.getSeconds();
    io.emit("onemin", timeToSend); // Emit the formatted time
    if (timeToSend === 3) {
      // oneMinCheckResult();
      oneMinColorWinning();
    }
  });
}
const oneMinCheckResult = async () => {
  try {
    await axios.get(`https://admin.sunlottery.fun/api/checkresult`);
  } catch (e) {
    console.log(e);
  }
};
const oneMinColorWinning = async () => {
  try {
    await axios.get(
      `https://admin.sunlottery.fun/api/colour_winning?id=1&gid=1`
    );
  } catch (e) {
    console.log(e);
  }
};

// color prediction game time generated every 3 min
const generatedTimeEveryAfterEveryThreeMin = () => {
  let min = 2;
  const rule = new schedule.RecurrenceRule();
  rule.second = new schedule.Range(0, 59);
  const job = schedule.scheduleJob("* * * * * *", function () {
    const currentTime = new Date().getSeconds(); // Get the current time
    const timeToSend = currentTime > 0 ? 60 - currentTime : currentTime;
    io.emit("threemin", `${min}_${timeToSend}`);
    if (min === 0 && timeToSend === 25) {
      // oneMinCheckResult2min();
      oneMinColorWinning2min();
    }
    if (currentTime === 0) {
      min--;
      if (min < 0) min = 2; // Reset min to 2 when it reaches 0
    }
  });
};

const oneMinCheckResult2min = async () => {
  try {
    await axios.get(`https://admin.sunlottery.fun/api/checkresult`);
  } catch (e) {
    console.log(e);
  }
};
const oneMinColorWinning2min = async () => {
  try {
    await axios.get(
      `https://admin.sunlottery.fun/api/colour_winning?id=2&gid=2`
    );
  } catch (e) {
    console.log(e);
  }
};

const generatedTimeEveryAfterEveryFiveMin = () => {
  let min = 4;
  const rule = new schedule.RecurrenceRule();
  rule.second = new schedule.Range(0, 59);
  const job = schedule.scheduleJob("* * * * * *", function () {
    const currentTime = new Date().getSeconds(); // Get the current time
    const timeToSend = currentTime > 0 ? 60 - currentTime : currentTime;
    io.emit("fivemin", `${min}_${timeToSend}`);

    if (
      timeToSend === 40 && // this is for sec
      min === 0 // this is for minut
    ) {
      // oneMinCheckResult3sec();
      oneMinColorWinning3sec();
    }
    ///
    if (currentTime === 0) {
      min--;
      if (min < 0) min = 4; // Reset min to 2 when it reaches 0
    }
  });
};

const oneMinCheckResult3sec = async () => {
  try {
    await axios.get(`https://admin.sunlottery.fun/api/checkresult`);
  } catch (e) {
    console.log(e);
  }
};
const oneMinColorWinning3sec = async () => {
  try {
    await axios.get(
      `https://admin.sunlottery.fun/api/colour_winning?id=3&gid=3`
    );
  } catch (e) {
    console.log(e);
  }
};

// color prediction game time generated every 1 min
function generatedTimeEveryAfterEveryOneMinTRX() {
  let three = 0;
  let five = 0;
  const rule = new schedule.RecurrenceRule();
  rule.second = new schedule.Range(0, 59);
  const job = schedule.scheduleJob(rule, function () {
    const currentTime = new Date();
    const timeToSend =
      currentTime.getSeconds() > 0
        ? 60 - currentTime.getSeconds()
        : currentTime.getSeconds();
    io.emit("onemintrx", timeToSend);
    if (timeToSend === 6) {
      const datetoAPISend = parseInt(new Date().getTime().toString());
      const actualtome = soment.tz("Asia/Kolkata");
      const time = actualtome.add(8, "hours").valueOf();
      try {
        if (three === 2) {
          three = 0;
        } else {
          three++;
        }

        if (five === 4) {
          five = 0;
        } else {
          five++;
        }
        setTimeout(async () => {
          const res = await axios.get(
            `https://apilist.tronscanapi.com/api/block?sort=-balance&start=0&limit=20&producer=&number=&start_timestamp=${datetoAPISend}&end_timestamp=${datetoAPISend}`
          );
          if (res?.data?.data[0]) {
            const obj = res.data.data[0];
            const fd = new FormData();
            fd.append("hash", `**${obj.hash.slice(-4)}`);
            fd.append("digits", `${obj.hash.slice(-5)}`);
            fd.append("number", obj.number);
            fd.append("time", moment(time).format("HH:mm:ss"));

            const newString = obj.hash;
            let num = null;
            for (let i = newString.length - 1; i >= 0; i--) {
              if (!isNaN(parseInt(newString[i]))) {
                num = parseInt(newString[i]);
                break;
              }
            }
            fd.append("slotid", num);
            fd.append("overall", JSON.stringify(obj));
            //  trx 1
            try {
              const response = await axios.post(
                "https://admin.sunlottery.fun/api/insert-one-trx",
                fd
              );
            } catch (e) {
              console.log(e);
            }
            try {
              const response = await axios.get(
                `https://admin.sunlottery.fun/api/trx-winning-result?number=${num}&gameid=1`
              );
            } catch (e) {
              console.log(e);
            }
          }
        }, [6000]);
      } catch (e) {
        console.log(e);
      }
    }
  });
}
let twoMinTrxJob;
// sdafas??
const generatedTimeEveryAfterEveryThreeMinTRX = () => {
  let min = 2;
  twoMinTrxJob = schedule.scheduleJob("* * * * * *", function () {
    const currentTime = new Date().getSeconds(); // Get the current time
    const timeToSend = currentTime > 0 ? 60 - currentTime : currentTime;
    io.emit("threemintrx", `${min}_${timeToSend}`);
    if (min === 0 && timeToSend === 6) {
      const datetoAPISend = parseInt(new Date().getTime().toString());
      const actualtome = soment.tz("Asia/Kolkata");
      const time = actualtome.add(8, "hours").valueOf();
      try {
        setTimeout(async () => {
          const res = await axios.get(
            `https://apilist.tronscanapi.com/api/block?sort=-balance&start=0&limit=20&producer=&number=&start_timestamp=${datetoAPISend}&end_timestamp=${datetoAPISend}`
          );
          if (res?.data?.data[0]) {
            const obj = res.data.data[0];
            const fd = new FormData();
            fd.append("hash", `**${obj.hash.slice(-4)}`);
            fd.append("digits", `${obj.hash.slice(-5)}`);
            fd.append("number", obj.number);
            fd.append("time", moment(time).format("HH:mm:ss"));
            const newString = obj.hash;
            let num = null;
            for (let i = newString.length - 1; i >= 0; i--) {
              if (!isNaN(parseInt(newString[i]))) {
                num = parseInt(newString[i]);
                break;
              }
            }
            fd.append("slotid", num);
            fd.append("overall", JSON.stringify(obj));
            //  trx 3
            try {
              const response = await axios.post(
                "https://admin.sunlottery.fun/api/insert-three-trx",
                fd
              );
            } catch (e) {
              console.log(e);
            }
            try {
              const response = await axios.get(
                `https://admin.sunlottery.fun/api/trx-winning-result?number=${num}&gameid=2`
              );
            } catch (e) {
              console.log(e);
            }
          }
        }, [6000]);
      } catch (e) {
        console.log(e);
      }
    }
    if (currentTime === 0) {
      min--;
      if (min < 0) min = 2; // Reset min to 2 when it reaches 0
    }
  });
};
let threeMinTrxJob;
const generatedTimeEveryAfterEveryFiveMinTRX = () => {
  let min = 4;
  threeMinTrxJob = schedule.scheduleJob("* * * * * *", function () {
    const currentTime = new Date().getSeconds(); // Get the current time
    const timeToSend = currentTime > 0 ? 60 - currentTime : currentTime;
    io.emit("fivemintrx", `${min}_${timeToSend}`);
    if (min === 0 && timeToSend === 6) {
      const datetoAPISend = parseInt(new Date().getTime().toString());
      const actualtome = soment.tz("Asia/Kolkata");
      const time = actualtome.add(8, "hours").valueOf();
      try {
        setTimeout(async () => {
          const res = await axios.get(
            `https://apilist.tronscanapi.com/api/block?sort=-balance&start=0&limit=20&producer=&number=&start_timestamp=${datetoAPISend}&end_timestamp=${datetoAPISend}`
          );
          if (res?.data?.data[0]) {
            const obj = res.data.data[0];
            const fd = new FormData();
            fd.append("hash", `**${obj.hash.slice(-4)}`);
            fd.append("digits", `${obj.hash.slice(-5)}`);
            fd.append("number", obj.number);
            fd.append("time", moment(time).format("HH:mm:ss"));
            const newString = obj.hash;
            let num = null;
            for (let i = newString.length - 1; i >= 0; i--) {
              if (!isNaN(parseInt(newString[i]))) {
                num = parseInt(newString[i]);
                break;
              }
            }
            fd.append("slotid", num);
            fd.append("overall", JSON.stringify(obj));
            //  trx 3
            try {
              const response = await axios.post(
                "https://admin.sunlottery.fun/api/insert-five-trx",
                fd
              );
            } catch (e) {
              console.log(e);
            }
            try {
              const response = await axios.get(
                `https://admin.sunlottery.fun/api/trx-winning-result?number=${num}&gameid=3`
              );
            } catch (e) {
              console.log(e);
            }
          }
        }, [6000]);
      } catch (e) {
        console.log(e);
      }
    }
    if (currentTime === 0) {
      min--;
      if (min < 0) min = 4; // Reset min to 4 when it reaches 0
    }
  });
};

let y = true;

if (y) {

  generateAndSendMessage(0,0);

  console.log("Waiting for the next minute to start...");
  const now = new Date();
  const secondsUntilNextMinute = 60 - now.getSeconds();
  setTimeout(() => {
    generatedTimeEveryAfterEveryOneMinTRX();
    generatedTimeEveryAfterEveryOneMin();
    generatedTimeEveryAfterEveryThreeMin();
    generatedTimeEveryAfterEveryFiveMin();
    y = false;
  }, secondsUntilNextMinute * 1000);
}
const finalRescheduleJob = schedule.scheduleJob(
  "15,30,45,0 * * * *",
  function () {
    twoMinTrxJob?.cancel();
    threeMinTrxJob?.cancel();
    generatedTimeEveryAfterEveryThreeMinTRX();
    generatedTimeEveryAfterEveryFiveMinTRX();
  }
);

app.get("/", (req, res) => {
  res.send(`<h1>This is simple port which is running at -====> ${PORT}</h1>`);
});

httpServer.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
