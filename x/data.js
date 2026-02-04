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
    logger.info(`DATA.length: ${DATA.length}`);
    // Save DATA only for development
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
  logger.info("----- getData()");

  try {
    // Set the query (filters)
    let query = `&query=${queryStr} since:${await getXQueryStartDttm()} until:${await getXQueryEndDttm()}`;

    // Pagination
    logger.info(`>>> next_cursor: ${next_cursor}`);
    if (next_cursor !== undefined) {
      query += `&cursor=${next_cursor}`;
    }
    logger.info(`>>> Query str: ${query}`);
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
      logger.info(`Tweets cnt: ${responseJson.tweets.length}`);
      for (const tweet of responseJson.tweets) {
        tweet._timeUtc = `${tweet.createdAt.split(" ")[3]} (UTC)`;
        DATA.push(tweet);
      }
    }

    // If there where 20 messages (API limit) for the query get the next 20.
    if (
      responseJson.has_next_page &&
      responseJson.tweets &&
      responseJson.tweets.length > 19
    ) {
      await runQuery(queryStr, responseJson.next_cursor);
    }
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
