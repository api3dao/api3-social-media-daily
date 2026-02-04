"use strict";

const { CronJob } = require("cron");
const x = require("./x/main");
const community = require("./community/main");
const { getCurrentDttmUtcHumanReadable } = require("./utils/utc");
const fs = require("fs");
const CONFIG = JSON.parse(fs.readFileSync("./config.json", "utf-8"))[
  process.env.NODE_ENV
];

// Startup output
console.log("----------------------------------");
console.log(`>>> NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`>>> CONFIG: ${JSON.stringify(CONFIG, null, 3)}`);
console.log(">>> Startup:", getCurrentDttmUtcHumanReadable());
console.log("----------------------------------");

/**
 * Start the cron process to run once daily
 * "0 5 0 * * 0-6" = Midnight plus 5 minutes every day
 */
const job = new CronJob(
  "0 5 0 * * 0-6", // cronTime
  async function () {
    console.log("... Midnight start");
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

// Run the X process in dev on startup
if (process.env.NODE_ENV === "development") {
  runDevStartup();
}
