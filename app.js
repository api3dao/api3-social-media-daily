"use strict";

const { CronJob } = require("cron");
const { run } = require("./slack/main");
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
    await run();
  }, // onTick
  null, // onComplete
  true, // start
  "UTC", // timeZone
);

async function runDevStartup() {
  run();
}

// Run the Slack process in dev on startup
if (process.env.NODE_ENV === "development") {
  runDevStartup();
}
