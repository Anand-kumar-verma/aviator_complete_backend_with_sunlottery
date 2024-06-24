// socketSetup.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    credentials: true,
    optionsSuccessStatus: 200,
  },
});

module.exports = { io, httpServer, app };