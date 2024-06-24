// const con = require("../../config/database");

// exports.promotionCount = async (req, res) => {
//   const { id } = req.query;
//   if (!id || isNaN(id)) {
//     return res.status(400).json({
//       message: "Id is missing or invalid",
//     });
//   }

//   try {
//     con.query("SELECT * FROM user", (err, result) => {
//       if (err) {
//         console.error(err);
//         return res.status(500).json({
//           msg: "Error in data fetching",
//           error: err.message,
//           er: err,
//         });
//       }

//       const array = result.map((i) => ({
//         ...i,
//         count: 0,
//         teamcount: 0,
//         directReferrals: [],
//       }));

//       let new_data = updateReferralCountnew(array).find((i) => i.id == id);
//       const levels = Array.from({ length: 20 }, (_, i) => `level_${i + 1}`);

//       let direct_ids = new_data.directReferrals?.map((i) => i?.c_id);

//       let indirect_ids = [];
//       for (let i = levels.length - 1; i >= 0; i--) {
//         let currentLevel = new_data?.teamMembersByLevel[levels[i - 1]];
//         let nextLevel = new_data?.teamMembersByLevel[levels[i]];

//         if (currentLevel && nextLevel) {
//           let idsToRemove = currentLevel.map((item) => item.id);
//           nextLevel = nextLevel.filter(
//             (item) => !idsToRemove.includes(item.id)
//           );
//           new_data.teamMembersByLevel[levels[i]] = nextLevel;
//         }
//       }

//       for (let i = 1; i <= 20; i++) {
//         if (new_data.teamMembersByLevel[`level_${i}`]?.length > 0) {
//           indirect_ids.push(
//             ...new_data.teamMembersByLevel[`level_${i}`].map((item) => item.id)
//           );
//         }
//       }

//       new_data = { ...new_data, deposit_member_amount: [] };

//       const promises = [];
//       for (let i = 1; i <= 20; i++) {
//         if (new_data.teamMembersByLevel[`level_${i}`]?.length > 0) {
//           let levelIds = new_data.teamMembersByLevel[`level_${i}`].map(
//             (k) => k.id
//           );
//           const promise = new Promise((resolve, reject) => {
//             con.query(
//               `SELECT SUM(tr15_amt) AS total_amount,count(*) AS total_member FROM tr15_fund_request WHERE tr15_status = 'Success' AND tr15_depo_type = 'Winzo' AND tr15_uid IN (${levelIds.join(
//                 ","
//               )});`,
//               (err, resultteamamount) => {
//                 if (err) {
//                   console.error(err);
//                   reject(err);
//                 } else {
//                   resolve(resultteamamount[0].total_amount || 0);
//                 }
//               }
//             );
//           });
//           promises.push(promise);
//         } else {
//           promises.push(0);
//         }
//       }

//       Promise.all(promises)
//         .then((deposit_member_amounts) => {
//           new_data.deposit_member_amount = deposit_member_amounts;
//           con.query(
//             `SELECT SUM(tr15_amt) AS total_amount,COUNT(DISTINCT tr15_uid) AS total_member FROM tr15_fund_request WHERE tr15_status = 'Success' AND tr15_depo_type = 'Winzo' AND tr15_uid IN (${direct_ids.join(
//               ","
//             )});`,
//             (err, result) => {
//               if (err) {
//                 console.error(err);
//                 return res.status(500).json({
//                   msg: "Error in data fetching",
//                   error: err.message,
//                   er: err,
//                 });
//               }

//               con.query(
//                 `SELECT SUM(tr15_amt) AS total_amount,COUNT(DISTINCT tr15_uid) AS total_member FROM tr15_fund_request WHERE tr15_status = 'Success' AND tr15_depo_type = 'Winzo' AND tr15_uid IN (${indirect_ids.join(
//                   ","
//                 )});`,
//                 (err, resultteam) => {
//                   if (err) {
//                     console.error(err);
//                     return res.status(500).json({
//                       msg: "Error in data fetching",
//                       error: err.message,
//                       er: err,
//                     });
//                   }

//                   return res.status(200).json({
//                     data: {
//                       ...new_data,
//                       deposit_member: result[0].total_member || 0,
//                       deposit_recharge: result[0].total_amount || 0,
//                       deposit_member_team: resultteam[0].total_member || 0,
//                       deposit_recharge_team: resultteam[0].total_amount || 0,
//                     },
//                     msg: "Data fetched successfully",
//                   });
//                 }
//               );
//             }
//           );
//         })
//         .catch((err) => {
//           console.error(err);
//           return res.status(500).json({
//             msg: "Error in data fetching",
//             error: err.message,
//             er: err,
//           });
//         });
//     });
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({
//       msg: "Error in data fetching",
//       error: e.message,
//     });
//   }
// };

// function updateReferralCountnew(users) {
//   const countMap = {};
//   const teamCountMap = {};

//   // Initialize count for each user
//   users.forEach((user) => {
//     countMap[user.id] = 0;
//     teamCountMap[user.id] = 0;
//     user.directReferrals = []; // Initialize directReferrals array for each user
//   });

//   // Update count for each referral used
//   users.forEach((user) => {
//     // Check if referral_user_id exists in countMap
//     if (countMap.hasOwnProperty(user.referral_user_id)) {
//       // Increase the count for the referral_user_id by 1
//       countMap[user.referral_user_id]++;
//     }
//   });

//   // Update team count, deposit_member, and deposit_member_team count for each user recursively
//   const updateTeamCountRecursively = (user) => {
//     let totalChildrenCount = 0;

//     // Check if the user id exists in countMap
//     if (countMap.hasOwnProperty(user.id)) {
//       totalChildrenCount += countMap[user.id];

//       // Iterate through each user
//       users.forEach((u) => {
//         // Check if the user's referral_user_id matches the current user's id
//         if (u.referral_user_id === user.id) {
//           // Check if the user's referral_user_id is not null
//           if (user.referral_user_id !== null) {
//             // Check if the directReferrals array does not already contain the current user
//             if (
//               !user.directReferrals.some((referral) => referral.c_id === u.id)
//             ) {
//               // If not, add the user to the directReferrals array
//               user.directReferrals.push({
//                 user_name: u.full_name,
//                 mobile: u.mobile,
//                 c_id: u.id,
//                 id: u.username,
//               });
//             }
//           }
//           // Recursively update the team count for the current user
//           totalChildrenCount += updateTeamCountRecursively(u);
//         }
//       });
//     }

//     return totalChildrenCount;
//   };

//   users.forEach((user) => {
//     // Update teamCountMap if user.id exists in countMap
//     if (countMap.hasOwnProperty(user.id)) {
//       teamCountMap[user.id] = updateTeamCountRecursively(user);
//     }

//     // Add direct referral to the user's directReferrals array
//   });

//   const updateUserLevelRecursively = (user, level, maxLevel) => {
//     if (level === 0 || level > maxLevel) return []; // Return an empty array if we reached the desired level or exceeded the maximum level

//     const levelMembers = [];

//     // Iterate through each user
//     users.forEach((u) => {
//       // Check if the user's referral_user_id matches the current user's id
//       if (u.referral_user_id === user.id) {
//         // Add the user's full_name and id to the levelMembers array
//         levelMembers.push({ full_name: u.full_name, id: u.id });

//         // Recursively update the team members for the current user at the next level
//         const children = updateUserLevelRecursively(u, level + 1, maxLevel); // Increase level for the next level
//         levelMembers.push(...children); // Concatenate children to the current levelMembers array
//       }
//     });

//     return levelMembers;
//   };

//   users.forEach((user) => {
//     // Initialize arrays for each level of team members
//     user.teamMembersByLevel = {};

//     // Populate arrays with team members at each level
//     for (let i = 1; i <= 20; i++) {
//       const levelMembers = updateUserLevelRecursively(user, 1, i); // Start from level 1 and set the maximum level for this user
//       user.teamMembersByLevel[`level_${i}`] = levelMembers;
//       if (levelMembers.length === 0) break; // Stop populating arrays if no team members at this level
//     }
//   });
//   // Assign counts to each user
//   users.forEach((user) => {
//     // Update user properties with countMap, teamCountMap, depositMemberMap, depositMemberTeamMap,
//     // depositRechargeMap, and depositRechargeTeamMap if user.id exists in the respective maps
//     user.count = countMap.hasOwnProperty(user.id) ? countMap[user.id] : 0;
//     user.teamcount = teamCountMap.hasOwnProperty(user.id)
//       ? teamCountMap[user.id]
//       : 0;
//   });
//   return users;
// }

// exports.topw11winningInformation = async (req, res) => {
//   try {
//     con.query(
//       "SELECT colour_bet.*, user.full_name, user.winning_wallet, user.email FROM colour_bet JOIN user ON colour_bet.userid = user.id ORDER BY CAST(colour_bet.win AS UNSIGNED) DESC LIMIT 11;",
//       (err, result) => {
//         if (err) {
//           console.error(err);
//           return res.status(500).json({
//             msg: "Error in data fetching",
//             error: err.message,
//           });
//         }

//         if (result && result.length > 0) {
//           return res.status(200).json({
//             msg: "Data fetched successfully",
//             data: result,
//           });
//         } else {
//           return res.status(404).json({
//             msg: "No data found",
//           });
//         }
//       }
//     );
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({
//       msg: "Error in data fetching",
//       error: e.message,
//     });
//   }
// };
