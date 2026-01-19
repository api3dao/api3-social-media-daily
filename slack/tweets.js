const from = ["Morpho"];
const fs = require("fs");
const { getData } = require("./data");

const DIVIDER = {
  type: "divider",
};

/**
 *  * Example
 *
 * User:
 * from:Morpho
 *
 * Yesterday:
 * since:2026-01-14_00:00:00_UTC
 *
 * @param {*} web
 * @param {*} threadTs
 * @param {*} conversationId
 */
async function postTweets(web, threadTs, conversationId) {
  // Get data from data.js
  const data = await getData();

  // Spin through the data and post to Slack
  let cnt = 0;
  for (const tweet of data) {
    let blocks = [];
    console.log(
      tweet.author.userName,
      tweet.id,
      tweet.createdAt,
      tweet._timeUtc,
    );
    cnt++;
    // Get blocks
    blocks.push(DIVIDER);
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

    // Send message
    // @TODO ADD TRY/CATCH
    const result = await web.chat.postMessage({
      channel: conversationId,
      thread_ts: threadTs,
      text: "The text key/value pair are required but not used.",
      unfurl_links: false,
      unfurl_media: false,
      blocks,
    });

    await sleep(500); // Pause for 1/2 second, Slack rate limit
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
        type: "mrkdwn",
        text: `*(${cnt})*`,
      },
      /* Twitter logo to be added later when other social media apps are supported
      {
        type: "image",
        image_url:
          "https://images.freeimages.com/image/large-previews/f35/x-twitter-logo-on-black-circle-5694247.png?fmt=webp&h=350",
        alt_text: "x",
      },*/
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
