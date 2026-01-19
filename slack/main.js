const { WebClient, ErrorCode } = require("@slack/web-api");
const { getXQueryRuntimeDttm } = require("../utils/utc");
const { postTweets } = require("./tweets");
const fs = require("fs");
const CONFIG = JSON.parse(fs.readFileSync("./config.json", "utf-8"))[
  process.env.NODE_ENV
];
const dayjs = require("dayjs");

// Initialize Slack web client
const web = new WebClient(CONFIG.slack.auth_token);
// Slack channel ID
const conversationId = CONFIG.slack.channel;

/**
 * Called by the cron job from app.js once a day
 */
async function run() {
  console.log("----- Running the daily report -----");

  try {
    console.log(">>>", await getXQueryRuntimeDttm());

    const result = await web.chat.postMessage({
      channel: conversationId,
      text: `Summary report for: ${await getXQueryRuntimeDttm()}`, // Will be in Slack notifications
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `_${await getXQueryRuntimeDttm()}_`,
          },
        },
      ],
    });
    console.log("Channel root message ID:", result.ts);

    await postTweets(web, result.ts, conversationId);
  } catch (error) {
    console.error(error);
  }
}

module.exports = { run };
