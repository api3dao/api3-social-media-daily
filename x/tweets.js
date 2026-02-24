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
const CHANNEL_ID = CONFIG.slack.channel;

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
      channel: CHANNEL_ID,
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

    // If we got this far then twitterapi.io or Slack did not fail
    retryCnt = 0;

    // The Slack root thread timestamp which is used to post all other messages in its thread
    threadTsRoot = result.ts;
    logger.info(`Channel ID: ${CHANNEL_ID}`);
    logger.info(`Thread ID: ${threadTsRoot}`);

    // Spin through the data and post to Slack in the thread of the root message
    for (const [index, tweet] of data.entries()) {
      try {
        let blocks = [];

        if (index >= 100) {
          logger.info(
            "Reached message limit of 100 tweets. Stopping further posts.",
          );
          await terminateReportMsg(threadTsRoot);
          break;
        }

        // Get blocks
        blocks.push(DIVIDER);
        blocks.push(await getHeaderBlock(index, tweet));
        blocks.push(await getBannerBlock(tweet));
        // Quoted a tweet, do not check tweet.quoted_tweet.quoted_tweet
        if (
          tweet.quoted_tweet &&
          !tweet.quoted_tweet.retweeted_tweet &&
          !tweet.quoted_tweet.article
        ) {
          blocks.push(await getRichText(tweet.text));
          blocks.push(
            await getAuthorBanner(tweet.quoted_tweet.author, "Quoted:"),
          );
          blocks.push(await getRichText(tweet.quoted_tweet.text));
        }
        // Quoted an article
        else if (tweet.quoted_tweet && tweet.quoted_tweet.article) {
          blocks.push(await getRichText(tweet.text));
          blocks.push(
            await getAuthorBanner(
              tweet.quoted_tweet.author,
              "Quoted article by:",
            ),
          );
          blocks.push(
            await getPlainText(
              `(Article)\n${tweet.quoted_tweet.article.title}`,
            ),
          );
          blocks.push(
            await getRichText(tweet.quoted_tweet.article.preview_text),
          );
        }
        // Post
        else if (
          !tweet.retweeted_tweet &&
          !tweet.quoted_tweet &&
          !tweet.article
        ) {
          blocks.push(await getRichText(tweet.text));
        }
        // Article
        else if (tweet.article) {
          blocks.push(await getPlainText(`(Article)\n${tweet.article.title}`));
          blocks.push(await getRichText(tweet.article.preview_text));
        }
        // Reposted a tweet
        else if (tweet.retweeted_tweet) {
          blocks.push(
            await getAuthorBanner(tweet.retweeted_tweet.author, "Reposted:"),
          );
          blocks.push(await getRichText(tweet.retweeted_tweet.text));
        } else {
          blocks.push(await getRichText(tweet.text));
          blocks.push(
            await getRichText(
              "Unable to classify this POST. Please view on X/Twitter by clicking the link above.",
            ),
          );
        }

        // Send message to Slack into the thread of the root message
        const result = await web.chat.postMessage({
          channel: CHANNEL_ID,
          thread_ts: threadTsRoot,
          text: "The text key/value pair are required but not used.",
          unfurl_links: false,
          unfurl_media: false,
          blocks,
        });

        await sleep(500); // Pause for 1/2 second, Slack rate limit
      } catch (error) {
        error._location = "x/tweets.js -> postTweets inner loop";
        error._message = error.toString();
        logger.error(error);
        try {
          await postError(index, tweet, error);
        } catch (e) {
          console.log();
        }
      }
    }
  } catch (error) {
    error._location = "x/tweets.js -> postTweets";
    error._message = error.toString();
    logger.error(error);

    // Retry logic for twitterapi.io or Slack first post failures.
    if (retryCnt >= 4) {
      logger.info(`Max retry attempts (${retryCnt}) reached. Exiting. <<<`);
      retryCnt = 0;
    } else {
      logger.info(`Retrying postTweets() - After attempt #${retryCnt} <<<`);

      // Set timer to retry again later
      setTimeout(async () => {
        retryCnt++;
        await postTweets();
      }, 900000); // 15 minutes, 900000 ms
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
  const link = `<${tweet.url}| View>`;
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
        text: `*@${tweet.author.userName} - _${tweet._timeUtc}_ - ${link}*`,
      },
    ],
  };

  return block;
}

/**
 *
 * @param {*} text
 * @returns
 */
async function getPlainText(text) {
  return {
    type: "section",
    text: {
      type: "plain_text",
      text: text,
      emoji: true,
    },
  };
}

/**
 * Create rich text block for the tweet's quoted or retweeted tweet
 * @param {*} tweet
 * @returns
 */
async function getRichText(text) {
  const block = {
    type: "rich_text",
    elements: [
      {
        type: "rich_text_preformatted",
        elements: [{ type: "text", text: `${text}` }],
      },
    ],
  };

  return block;
}

async function getAuthorBanner(author, label) {
  const block = {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `*${label}* `,
      },
      {
        type: "image",
        image_url: `${author.profilePicture}`,
        alt_text: "author",
      },
      {
        type: "plain_text",
        text: `${author.name} @${author.userName} `,
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
 * @param {*} threadTsRoot
 */
async function terminateReportMsg(threadTsRoot) {
  logger.info("Report terminated after reaching message limit of 100 posts.");
  // Send message to Slack in the thread of the root message
  await web.chat.postMessage({
    channel: CHANNEL_ID,
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

async function postError(index, tweet, error) {
  const headerBlock = await getHeaderBlock(index, tweet);
  const bannerBlock = await getBannerBlock(tweet);
  const dataBlock = {
    type: "rich_text",
    elements: [
      {
        type: "rich_text_preformatted",
        elements: [{ type: "text", text: `${JSON.stringify(error, null, 2)}` }],
      },
    ],
  };
  // Send error to Slack in the thread of the root message
  await web.chat.postMessage({
    channel: CHANNEL_ID,
    thread_ts: threadTsRoot,
    text: "Error",
    unfurl_links: false,
    unfurl_media: false,
    blocks: [DIVIDER, headerBlock, bannerBlock, dataBlock],
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
