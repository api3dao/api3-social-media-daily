const { WebClient } = require("@slack/web-api");
const {
  getDateUtcHumanReadable,
  getXQueryRuntimeDttm,
} = require("../utils/utc");
const fs = require("fs");
const CONFIG = JSON.parse(fs.readFileSync("./config.json", "utf-8"))[
  process.env.NODE_ENV
];
const logger = require("../utils/logger");
const { sendPushNotification } = require("../utils/pushover");

// Initialize Slack web client
const web = new WebClient(CONFIG.slack.auth_token);
// Slack channel ID
const channelId = CONFIG.slack.channel;

/**
 * The post Community messages process (cycle)
 */
async function postMessages() {
  try {
    // First post the root Slack message announcing the daily report
    const result = await web.chat.postMessage({
      channel: channelId,
      text: `Community report for: ${await getXQueryRuntimeDttm()}`, // Will be in Slack notifications
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Community*\n_${await getXQueryRuntimeDttm()}_`,
          },
        },
      ],
    });

    // Get the data from file-db/telegram, because it is 00:05 UTC now
    // We need yesterday's data for prod and today for dev
    const minus = process.env.NODE_ENV === "development" ? 0 : -1;
    const d = getDateUtcHumanReadable(minus);

    // Told hold file names from the two communities
    //let telegramData = [];
    //let discordData = [];

    // Hold messages from communities
    let messages = [];

    // Telegram data
    try {
      let telegramData = fs.readdirSync(`../file-db/telegram/_db_${d}`);
      telegramData = telegramData.filter((file) => file.endsWith(".json"));

      // Get messages from each file
      for (const [index, file] of telegramData.entries()) {
        let msg = fs.readFileSync(
          `../file-db/telegram/_db_${d}/${file}`,
          "utf-8",
        );
        // Must be a meaningful message
        msg = JSON.parse(msg);
        if (msg._text.length > 15) messages.push(msg);
      }
    } catch (error) {
      console.log(error);
      // Minor error, just log and continue, no messages that day
      logger.info(`Missing: ../file-db/telegram/_db_${d}`);
    }

    // Discord data
    try {
      let discordData = fs.readdirSync(`../file-db/discord/_db_${d}`);
      discordData = discordData.filter((file) => file.endsWith(".json"));

      // Get messages from each file
      for (const [index, file] of discordData.entries()) {
        let msg = fs.readFileSync(
          `../file-db/discord/_db_${d}/${file}`,
          "utf-8",
        );
        // Must be a meaningful message
        msg = JSON.parse(msg);
        if (msg._text.length > 15) messages.push(msg);
      }
    } catch (error) {
      console.log(error);
      // Minor error, just log and continue, no messages that day
      logger.info(`Missing: ../file-db/discord/_db_${d}`);
    }

    logger.info(`Meaningful messages cnt: ${messages.length}`);

    // If there are no meaningful messages then exit
    if (messages.length === 0) {
      await sendSlackNoMeaningfulMessages(result.ts);
      return;
    }

    // Sort the messages by _date
    messages.sort((a, b) => b._date - a._date);

    // Spin through the messages and post to Slack in the thread of the root message
    for (const [index, msg] of messages.entries()) {
      let blocks = [];
      // Header
      blocks.push(await getBannerBlock(msg));
      // Message text
      blocks.push(await getTextBlock(msg));
      // Divider (end)
      blocks.push({ type: "divider" });

      // Post the message in the thread
      const res = await web.chat.postMessage({
        channel: channelId,
        text: `Item ${index + 1}`, // Will be in Slack notifications
        thread_ts: result.ts,
        blocks: blocks,
      });
    }
    // Send message to pushover for monitoring
    sendPushNotification(
      "COMMUNITY RUN DONE",
      `Community messages posted: ${messages.length}`,
    );
  } catch (error) {
    error._location = "community/community.js -> postMessages";
    error._message = error.toString();
    logger.error(error);
  }
}

/**
 * Banner block for telegram message
 * @param {*} msg
 * @returns
 */
async function getBannerBlock(msg) {
  // Logo, Telegram or Discord

  let logo =
    "https://archive.org/download/github.com-discord-discord-open-source_-_2024-06-20_00-58-41/cover.jpg";
  if (msg._community === "telegram") {
    logo =
      "https://archive.org/download/png-transparent-blue-and-white-icon-illustration-telegram-logo-computer-icons-sc/png-transparent-blue-and-white-icon-illustration-telegram-logo-computer-icons-scalable-graphics-telegram-miscellaneous-blue-angle.png";
  }

  // Get the message time in UTC
  const dateObj = new Date(msg._date);
  dateObj.setDate(dateObj.getDate());
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
    hourCycle: "h23",
  };
  const time = dateObj.toLocaleTimeString(undefined, options) + " (UTC)";

  const block = {
    type: "context",
    elements: [
      {
        type: "image",
        image_url: logo,
        alt_text: "author",
      },
      {
        type: "mrkdwn",
        text: `*${msg._username}* - *${time}*`,
      },
    ],
  };

  return block;
}

async function getTextBlock(msg) {
  const block = {
    type: "rich_text",
    elements: [
      {
        type: "rich_text_section",
        elements: [
          {
            type: "text",
            text: msg._text,
          },
        ],
      },
    ],
  };
  return block;
}

async function sendSlackNoMeaningfulMessages(ts) {
  // Post the message in the thread
  const res = await web.chat.postMessage({
    channel: channelId,
    text: `No meaningful community messages posted`, // Will be in Slack notifications
    thread_ts: ts,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `There were no meaningful community messages posted for _${await getXQueryRuntimeDttm()}_`,
        },
      },
    ],
  });

  // Send message to pushover for monitoring
  sendPushNotification(
    "COMMUNITY RUN DONE",
    `No meaningful community messages posted`,
  );
}

module.exports = { postMessages };
