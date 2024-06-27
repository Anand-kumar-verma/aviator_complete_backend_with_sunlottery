const express = require("express");
const router = express.Router();
// const { loginFun, dashboardCounter, getAllAttendanceList, deleteAttendanceById, updateAttendanceById, getAllPlayer, updatePlayerRecord, updatePlayerStatus, addPlayer, getUserByRedId, getUserDataById, changePassword, withdrawlRequestFun, withdrawlApprovedFun, withdrawlRejectFun, withdrlApprovedFilterFun, withdrlRejectFilterFun, addSubAdmin, getSubAdminList, getAllAssignedMenu, shwoMenu, viewAllAsignedMenu, getSubMenu, addAttendance, addFund, getAllDirectReferralByUserId, getAllDownLineByUserId, depositRequestFilterCricket, depositRequestFilterWingo, withdrawlRequestReportCricket, withdrawlRequestReportWingo, colorPredictionOneMin, colorPredictionOneMinGetNextId, manuallyWinning, manuallyupdatePercentage, getFundHistory } = require("../controller/Aviator/login");
const { createUser, applybetFunction, cashOutFunction, adminWalletFunction, userLoginFunctoin, lossAmountFunction, getWalletByUserId, getGameHistory, getMyHistoryByID, getAviatorWalletAmountAdmin, getLederData } = require("../controller/Auth");



// aviator game api's
// router.get('/promotiondata',promotionCount)
// router.get('/topw11winningInformation',topw11winningInformation)
// router.post('/login',loginFun)
// router.get('/dashboard-counter',dashboardCounter)
// router.get('/getAllAttendanceList',getAllAttendanceList)
// router.delete('/deleteAttendanceById',deleteAttendanceById)
// router.put('/updateAttendanceById',updateAttendanceById)
// router.post('/addAttendance',addAttendance)
// router.get('/getAllPlayer',getAllPlayer)
// router.put('/updatePlayerRecord',updatePlayerRecord)
// router.put('/updatePlayerStatus',updatePlayerStatus)
// router.post('/addPlayer',addPlayer)
// router.get('/getUsernameBy_refId',getUserByRedId)
// router.get('/getPlayerDataById',getUserDataById)
// router.put('/changePassword',changePassword)
// router.post('/withdrawlRequest',withdrawlRequestFun)
// router.put('/withdrawlApproved',withdrawlApprovedFun)
// router.put('/withdrawlReject',withdrawlRejectFun)
// router.post('/withdrawlApprovedFilter',withdrlApprovedFilterFun)
// router.post('/withdrlRejectFilter',withdrlRejectFilterFun)
// router.post('/addSubAdmin',addSubAdmin)
// router.get('/getSubAdmin',getSubAdminList)
// router.get('/getAssignSubMenu',getAllAssignedMenu)
// router.get('/show-menu',shwoMenu)
// router.get('/show-submenu',getSubMenu)
// router.post('/add-fund',addFund)
// router.get('/direct-referral',getAllDirectReferralByUserId)
// router.get('/downline-referral-data',getAllDownLineByUserId)
// router.get('/view-cricket-main-wallet',depositRequestFilterCricket)
// router.get('/view-cricket-withdrawl-request-report',withdrawlRequestReportCricket)
// router.get('/view-wingo-main-wallet',depositRequestFilterWingo)
// router.get('/view-winzo-withdrawl-request-report',withdrawlRequestReportWingo)
// router.get('/get-bet-one-min-next-id',colorPredictionOneMinGetNextId)
// router.post('/manually-winning',manuallyWinning)
// router.post('/manually-update-percentage',manuallyupdatePercentage)
// router.get('/get-fund-history',getFundHistory)


////////////////////// mongo db routes //////////// for aviator
router.post("/createuser", createUser);
// router.post("/apply-bet", applybetFunction);
// router.post("/cash-out", cashOutFunction);
router.post("/admin-wallet", adminWalletFunction);
router.post("/login", userLoginFunctoin);
router.post("/lossamount", lossAmountFunction);
router.post("/get-wallet-amount-by-id", getWalletByUserId);
router.get("/get-game-history", getGameHistory);
router.post("/my-history-by-user-id", getMyHistoryByID);
router.get("/current-aviator-admin-wallet-amount", getAviatorWalletAmountAdmin);
router.get("/get-ledger-data", getLederData);


module.exports = router;
