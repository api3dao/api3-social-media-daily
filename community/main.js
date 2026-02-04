const { getXQueryRuntimeDttm } = require("../utils/utc");
const { postMessages } = require("./community");

/**
 * Called by the cron job from app.js once a day
 */
async function run() {
  console.log("\n----- Running the community report -----");
  try {
    console.log(">>>", await getXQueryRuntimeDttm());
    await postMessages();
  } catch (error) {
    console.error(error);
  }
}

module.exports = { run };
