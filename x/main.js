const { getXQueryRuntimeDttm } = require("../utils/utc");
const { postTweets } = require("./tweets");

/**
 * Called by the cron job from app.js once a day
 */
async function run() {
  console.log("----- Running the daily report -----");
  try {
    console.log(">>>", await getXQueryRuntimeDttm());
    await postTweets();
  } catch (error) {
    console.error(error);
  }
}

module.exports = { run };
