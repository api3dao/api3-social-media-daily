const { WebClient } = require("@slack/web-api");
const {
  getDateUtcHumanReadable,
  getXQueryRuntimeDttm,
} = require("../utils/utc");
const dayjs = require("dayjs");
const fs = require("fs");
const CONFIG = JSON.parse(fs.readFileSync("./config.json", "utf-8"))[
  process.env.NODE_ENV
];

// Initialize Slack web client
const web = new WebClient(CONFIG.slack.auth_token);
// Slack channel ID
const channelId = CONFIG.slack.channel;

async function postMessages() {
  try {
    // Get the data from file-db/telegram, because it is 00:05 UTC now, we need yesterday's data
    const minus = process.env.NODE_ENV === "development" ? 0 : -1;
    const d = getDateUtcHumanReadable(minus);
    console.log(d);
    let telegramData = [];
    let discordData = [];

    // Telegram data
    try {
      telegramData = fs.readdirSync(`../file-db/telegram/_db_${d}`);
    } catch (error) {
      console.error("Missing Telegram data directory.");
      telegramData = [];
    }

    // Discord data
    try {
      discordData = fs.readdirSync(`../file-db/discord/_db_${d}`);
    } catch (error) {
      console.error("Missing Discord data directory.");
      discordData = [];
    }
    console.log("t:", telegramData);
    console.log("d:", discordData);

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

    // TODO: Join the two data arrays
    let combinedData = telegramData.concat(discordData);

    // Create and sort messages array by the date key
    let messages = [];
    for (const [index, file] of combinedData.entries()) {
      let blocks = [];
      // Get the file content
      const msg = fs.readFileSync(
        `../file-db/telegram/_db_${d}/${file}`,
        "utf-8",
      );
      messages.push(JSON.parse(msg));
    }
    messages.sort((a, b) => b.date - a.date);
    console.log(">>> messages:", messages);

    // Spin through the messages and post to Slack in the thread of the root message
    for (const [index, msg] of messages.entries()) {
      let blocks = [];
      // Header
      blocks.push(await getBannerBlockTelegram(msg));
      // Message text
      blocks.push(await getTextBlockTelegram(msg));
      // Divider (end)
      blocks.push({ type: "divider" });

      // Post the message in the thread
      const res = await web.chat.postMessage({
        channel: channelId,
        text: `Item ${index + 1}`, // Will be in Slack notifications
        thread_ts: result.ts,
        blocks: blocks,
      });
      //console.log(msg);
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * Banner block for telegram message
 * @param {*} msg
 * @returns
 */
async function getBannerBlockTelegram(msg) {
  // Discord logo URL
  // https://archive.org/details/github.com-discord-discord-open-source_-_2024-06-20_00-58-41

  // Get the message time in UTC
  const dateObj = new Date(msg.date * 1000); // Convert seconds to milliseconds
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
        image_url:
          "https://archive.org/download/png-transparent-blue-and-white-icon-illustration-telegram-logo-computer-icons-sc/png-transparent-blue-and-white-icon-illustration-telegram-logo-computer-icons-scalable-graphics-telegram-miscellaneous-blue-angle.png",
        alt_text: "author",
      },
      {
        type: "mrkdwn",
        text: `*@${msg.from.username}* - *${time}*`,
      },
    ],
  };

  return block;
}

async function getTextBlockTelegram(msg) {
  const block = {
    type: "rich_text",
    elements: [
      {
        type: "rich_text_section",
        elements: [
          {
            type: "text",
            text: msg.text,
          },
        ],
      },
    ],
  };
  return block;
}

module.exports = { postMessages };
