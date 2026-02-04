const { WebClient } = require("@slack/web-api");
const { getXQueryRuntimeDttm } = require("../utils/utc");

const { getData } = require("./data");
const fs = require("fs");
const CONFIG = JSON.parse(fs.readFileSync("./config.json", "utf-8"))[
  process.env.NODE_ENV
];
const logger = require("../utils/logger");

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
      text: `X report for: ${await getXQueryRuntimeDttm()}`, // Will be in Slack notifications
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*X/Twitter*\n_${await getXQueryRuntimeDttm()}_`,
          },
        },
      ],
    });

    // If we got this far then twitterapi.io did not fail
    retryCnt = 0;

    logger.info("Channel root message ID:", result.ts);
    // The Slack root thread timestamp which is used to post all other messages in its thread
    const threadTsRoot = result.ts;

    // Spin through the data and post to Slack in the thread of the root message
    for (const [index, tweet] of data.entries()) {
      let blocks = [];

      if (index >= 100) {
        logger.info(
          "Reached message limit of 100 tweets. Stopping further posts.",
        );
        await terminateReportMsg(channelId, threadTsRoot);
        break;
      }

      // Get blocks
      blocks.push(DIVIDER);
      blocks.push(await getHeaderBlock(index, tweet));
      blocks.push(await getBannerBlock(tweet));
      if (!tweet.retweeted_tweet) {
        blocks.push(await getBannerTweetBlock(tweet));
        blocks.push(await getTextBlock(tweet));
      }
      if (tweet.quoted_tweet) {
        blocks.push(await getBannerQuotedBlock(tweet.quoted_tweet));
        blocks.push(await getRichTextBlock(tweet.quoted_tweet));
      }
      if (tweet.retweeted_tweet) {
        blocks.push(await getBannerRetweetedBlock(tweet.retweeted_tweet));
        blocks.push(await getRichTextBlock(tweet.retweeted_tweet));
      }

      // Send message to Slack into the thread of the root message
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
    error._location = "x/tweets.js -> postTweets";
    error._message = error.toString();
    logger.error(error);

    if (retryCnt >= 24) {
      logger.info(`Max retry attempts (${retryCnt}) reached. Exiting. <<<`);
      retryCnt = 0;
    } else {
      logger.info(`Retrying postTweets() - After attempt #${retryCnt} <<<`);
      // TODO: set timer to retry again later
      setTimeout(async () => {
        retryCnt++;
        await postTweets();
      }, 900000); // 15 minutes
    }
  }
}

/**
 * The top most label header block with author name
 * @param {*} index
 * @param {*} tweet
 * @returns
 */
async function getHeaderBlock(index, tweet) {
  // Link to the tweet
  const link = `<${tweet.url}| View on X>`;

  const block = {
    type: "header",
    text: {
      type: "plain_text",
      text: `(${index + 1}) ${tweet.author.name}`,
    },
  };

  return block;
}

/**
 * Banner block for tweets and quoted tweets
 * @param {*} tweet
 * @returns
 */
async function getBannerBlock(tweet) {
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
        text: `*@${tweet.author.userName} - _${tweet._timeUtc}_*\n*${link}* ${tweet.isReply ? `}, // - (Reply to @${tweet.inReplyToUsername})` : ""}`,
      },
    ],
  };

  return block;
}

/**
 * Creates text block for the tweet's main body
 * @param {*} tweet
 * @returns
 */
async function getTextBlock(tweet) {
  // Block with the tweet data
  /*const block = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*|* Tweet:\n${tweet.text}`,
    },
  };*/
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

/**
 * Create rich text block for the tweet's quoted or retweeted tweet
 * @param {*} tweet
 * @returns
 */
async function getRichTextBlock(tweet) {
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

async function getBannerTweetBlock(tweet) {
  const block = {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "*|* Tweeted: ",
      },
    ],
  };
  return block;
}

/**
 * The banner block for quoted tweets, image and name/username
 * @param {*} tweet
 * @returns
 */
async function getBannerQuotedBlock(tweet) {
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

/**
 * The banner block for retweeted tweets, image and name/username
 * @param {*} tweet
 * @returns
 */
async function getBannerRetweetedBlock(tweet) {
  const block = {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "*|* Reposted: ",
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

/**
 * The daily report termination message after reaching 100 posts
 * Prevents Slack message overloads and potential rate limiting
 * Also prevents report runaway
 * @param {*} channelId
 * @param {*} threadTsRoot
 */
async function terminateReportMsg(channelId, threadTsRoot) {
  logger.info("Report terminated after reaching message limit of 100 posts.");
  // Send message to Slack in the thread of the root message
  await web.chat.postMessage({
    channel: channelId,
    thread_ts: threadTsRoot,
    text: "Post limit reached.",
    unfurl_links: false,
    unfurl_media: false,
    blocks: [
      DIVIDER,
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `Report Limit Reached`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `The daily summary report was stopped after reaching the message limit of 100 posts.`,
        },
      },
    ],
  });
}

/**
 * Pause between Slack posts to avoid rate limiting
 * @param {*} ms
 * @returns
 */
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { postTweets };
