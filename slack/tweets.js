const { WebClient, ErrorCode } = require("@slack/web-api");
const { getXQueryRuntimeDttm } = require("../utils/utc");

const { getData } = require("./data");
const fs = require("fs");
const CONFIG = JSON.parse(fs.readFileSync("./config.json", "utf-8"))[
  process.env.NODE_ENV
];

const DIVIDER = {
  type: "divider",
};
// Initialize Slack web client
const web = new WebClient(CONFIG.slack.auth_token);
// Slack channel ID
const channelId = CONFIG.slack.channel;
// Retry cnt for twitterapi.io
let retryCnt = 0;

/**
 *  Post tweets to Slack channel
 */
async function postTweets() {
  try {
    // Get data from data.js
    // getData() will throw an error if twitterapi.io fails and this app's internal errors
    const data = await getData();

    // First post the root Slack message announcing the daily report
    const result = await web.chat.postMessage({
      channel: channelId,
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

    // If we got this far then twitterapi.io did not fail
    retryCnt = 0;

    console.log("Channel root message ID:", result.ts);
    // The Slack root thread timestamp which is used to post all other messages in its thread
    const threadTsRoot = result.ts;

    // Spin through the data and post to Slack in the thread of the root message
    let cnt = 0;
    for (const tweet of data) {
      let blocks = [];
      /*console.log(
        tweet.author.userName,
        tweet.id,
        tweet.createdAt,
        tweet._timeUtc,
      );*/
      cnt++;
      // Get blocks
      blocks.push(DIVIDER);
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `----- *(${cnt}) ${tweet.author.name}* -----`,
        },
      });
      blocks.push(await getBannerBlock(cnt, tweet));
      blocks.push(await getTextBlock(tweet));
      if (tweet.quoted_tweet) {
        blocks.push(await getQuotedBlock(tweet.quoted_tweet));
        blocks.push(await getTextBlock(tweet.quoted_tweet));
      }
      if (tweet.retweeted_tweet) {
        blocks.push(await getRetweetedBlock(tweet.retweeted_tweet));
        blocks.push(await getTextBlock(tweet.retweeted_tweet));
      }

      // Send message to Slack in the thread of the root message
      const result = await web.chat.postMessage({
        channel: channelId,
        thread_ts: threadTsRoot,
        text: "The text key/value pair are required but not used.",
        unfurl_links: false,
        unfurl_media: false,
        blocks,
      });

      await sleep(500); // Pause for 1/2 second, Slack rate limit
    }
  } catch (error) {
    console.error("\n----- Error in postTweets() -----");
    console.error(">>>", "Most likely cause: twitterapi.io failure");
    console.error(error);

    if (retryCnt >= 24) {
      console.error(
        `>>> Max retry attempts (${retryCnt}) reached. Exiting. <<<`,
      );
      retryCnt = 0;
    } else {
      console.log(`>>> Retrying postTweets() - After attempt #${retryCnt} <<<`);
      // TODO: set timer to retry again later
      setTimeout(async () => {
        retryCnt++;
        await postTweets();
      }, 900000); // 15 minutes
    }
    console.error("----- End error -----");
  }
}

/**
 * Banner block for tweets and quoted tweets
 * @param {*} tweet
 * @returns
 */
async function getBannerBlock(cnt, tweet) {
  // Link to the tweet
  const link = `<${tweet.url}| View on X>`;

  const block = {
    type: "context",
    elements: [
      {
        type: "image",
        image_url: tweet.author.profilePicture,
        alt_text: "author",
      },
      {
        type: "mrkdwn",
        text: `*@${tweet.author.userName} - _${tweet._timeUtc}_ - ${link}* `,
      },
    ],
  };

  return block;
}

/**
 *
 * @param {*} tweet
 * @returns
 */
async function getTextBlock(tweet) {
  // Block with the tweet data
  const block = {
    type: "rich_text",
    elements: [
      {
        type: "rich_text_preformatted",
        elements: [{ type: "text", text: `${tweet.text}` }],
      },
    ],
  };

  return block;
}

async function getQuotedBlock(tweet) {
  // Link to the tweet
  const link = `<${tweet.url}| View on Twitter/X>`;

  // Need only the time from createdAt
  const createdTime = tweet.createdAt.split(" ");

  const block = {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "*|* Quoted: ",
      },
      {
        type: "image",
        image_url: `${tweet.author.profilePicture}`,
        alt_text: "author",
      },
      {
        type: "plain_text",
        text: `${tweet.author.name} @${tweet.author.userName} `,
        emoji: true,
      },
    ],
  };
  return block;
}

async function getRetweetedBlock(tweet) {
  // Link to the tweet
  const link = `<${tweet.url}| View on Twitter/X>`;

  // Need only the time from createdAt
  const createdTime = tweet.createdAt.split(" ");

  const block = {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "*|* Retweeted: ",
      },
      {
        type: "image",
        image_url: `${tweet.author.profilePicture}`,
        alt_text: "author",
      },
      {
        type: "plain_text",
        text: `${tweet.author.name} @${tweet.author.userName} `,
        emoji: true,
      },
    ],
  };
  return block;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { postTweets };
