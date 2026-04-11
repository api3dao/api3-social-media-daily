const { getXQueryStartDttm, getXQueryEndDttm } = require("../utils/utc");
const fs = require("fs");
const CONFIG = JSON.parse(fs.readFileSync("./config.json", "utf-8"))[
  process.env.NODE_ENV
];
const logger = require("../utils/logger");

// The queries to execute
const QUERIES = CONFIG.x.queries;

// The tweet data
let DATA = [];

/**
 * Start the data retrieval process and return the data to the caller (mainly slack/tweets.js)
 * @returns
 */
async function getData() {
  try {
    DATA = [];
    for (const query of QUERIES) {
      await runQuery(query);
    }
    logger.info(`Tweets found: ${DATA.length}`);

    ///////////////////////////////////////
    /*const response = await fetch(
      `https://api.twitterapi.io/twitter/tweet/advanced_search?queryType=Latest&query=from:@wkande`,
      {
        method: "GET",
        headers: {
          "X-API-Key": CONFIG.x.twitter_api_io_key,
          "Content-Type": "application/json",
        },
      },
    );
    const wkandeTweets = await response.json();
    wkandeTweets.tweets.forEach((tweet) => {
      DATA.push(tweet);
    });*/
    //////////////////////////////

    // Save DATA only for development, for debugging purposes.
    if (process.env.NODE_ENV === "development") {
      fs.writeFileSync("../../tweets.json", JSON.stringify(DATA, null, 5));
    }

    return DATA;
  } catch (error) {
    error._location = "x/data.js -> getData";
    error._message = error.toString();
    throw error;
  }
}

/**
 * Run the query against the Twitter API
 * @param {*} query
 */
async function runQuery(queryStr, next_cursor = undefined) {
  try {
    // Set the query (filters)
    let query = `&query=${queryStr} since:${await getXQueryStartDttm()}`;
    // The end DTTM was removed as twitterapi.io seems to fail now with it. It had run fine for a few months before.
    // let query = `&query=${queryStr} since:${await getXQueryStartDttm()} until:${await getXQueryEndDttm()}`;

    // Pagination
    if (next_cursor !== undefined) {
      query += `&cursor=${next_cursor}`;
    }
    const response = await fetch(
      `https://api.twitterapi.io/twitter/tweet/advanced_search?queryType=Latest${query}`,
      {
        method: "GET",
        headers: {
          "X-API-Key": CONFIG.x.twitter_api_io_key,
          "Content-Type": "application/json",
        },
      },
    );

    // Tweets into DATA array
    const responseJson = await response.json();
    // The twitterapi.io API sucks for errors. Basically you have to check if the tweets key exists.
    // No tweets key means an error
    // The error can be in different root keys, detail, message, etc.
    if (!responseJson.tweets) {
      const e = new Error(JSON.stringify(responseJson, null, 3));
      throw new Error(e);
    } else {
      const author = query.split(" ")[0].split(":")[1];
      logger.info(
        `>>> ${author} >>> next_cursor: ${next_cursor} >>> cnt: ${responseJson.tweets.length}`,
      );
      for (const tweet of responseJson.tweets) {
        tweet._timeUtc = `${tweet.createdAt.split(" ")[3]} (UTC)`;
        // Sometime twitterapi.io add tweets outside of the author.username filter. So we need to filter them out manually.
        if (`@${tweet.author.userName}` === author) {
          DATA.push(tweet);
        }
      }
    }

    // 2026-Apr wkande: Ff they have more than 20 tweets it is not worth the excess chit chat
    // If there where 20 messages (API limit) for the query get the next 20.
    /*if (
      responseJson.has_next_page &&
      responseJson.tweets &&
      responseJson.tweets.length > 19
    ) {
      await runQuery(queryStr, responseJson.next_cursor);
    }*/

    // Sort the array by the _timeUtc key
    DATA.sort((a, b) => {
      return b._timeUtc.localeCompare(a._timeUtc);
    });

    return DATA;
  } catch (error) {
    error._location = "x/data.js -> runQuery";
    error._message = error.toString();
    throw error;
  }
}

module.exports = { getData };
