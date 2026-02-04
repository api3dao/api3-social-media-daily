const { getXQueryRuntimeDttm } = require("../utils/utc");
const { postTweets } = require("./tweets");
const logger = require("../utils/logger");

/**
 * Called by the cron job from app.js once a day
 */
async function run() {
  logger.info("----- Running the X report -----");
  try {
    logger.info(await getXQueryRuntimeDttm());
    await postTweets();
  } catch (error) {
    error._location = "x/main.js -> run";
    error._message = error.toString();
    logger.error(error);
  }
}

module.exports = { run };
