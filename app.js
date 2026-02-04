"use strict";

const { CronJob } = require("cron");
const x = require("./x/main");
const community = require("./community/main");
const { getCurrentDttmUtcHumanReadable } = require("./utils/utc");
const fs = require("fs");
const CONFIG = JSON.parse(fs.readFileSync("./config.json", "utf-8"))[
  process.env.NODE_ENV
];
const { sendPushNotification } = require("./utils/pushover");
const logger = require("./utils/logger");

// Startup output
async function output() {
  logger.info("----------------------------------");
  logger.info(`>>> NODE_ENV: ${process.env.NODE_ENV}`);
  logger.info(">>> Startup:", getCurrentDttmUtcHumanReadable());
  logger.info("----------------------------------");
  await sendPushNotification(
    "STARTUP",
    `App starting in ${process.env.NODE_ENV} mode`,
  );
}
output();

/**
 * Start the cron process to run once daily
 * "0 5 0 * * 0-6" = Midnight plus 5 minutes every day
 */
const job = new CronJob(
  "0 5 0 * * 0-6", // cronTime
  async function () {
    logger.info("... Midnight start");
    await x.run();
    await community.run();
  }, // onTick
  null, // onComplete
  true, // start
  "UTC", // timeZone
);

/**
 * Run the X process only on dev during startup
 */
async function runDevStartup() {
  await x.run();
  await community.run();
}

// Run the X and Community processes for dev on startup
if (process.env.NODE_ENV === "development") {
  setTimeout(() => {
    runDevStartup();
  }, 2000);
}
