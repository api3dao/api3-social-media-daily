const { getXQueryRuntimeDttm } = require("../utils/utc");
const { postMessages } = require("./community");
const logger = require("../utils/logger");

/**
 * Called by the cron job from app.js once a day
 */
async function run() {
  logger.info("----- Running the community report -----");
  try {
    logger.info(await getXQueryRuntimeDttm());
    await postMessages();
  } catch (error) {
    error._location = "community/main.js -> run";
    error._message = error.toString();
    logger.error(error);
  }
}

module.exports = { run };
