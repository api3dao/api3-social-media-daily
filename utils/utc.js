const dayjs = require("dayjs");

/**
 * Get the current date or adjusted date in human readable form
 * Dates are UTC only
 *
 * day === 0 returns the current date
 * day === -1 return yesterday
 * day === 1 returns tomorrow
 *
 * @param {*} day
 * @returns {string} the UTC date in human readable form
 */
function getDateUtcHumanReadable(day = 0) {
  const today = new Date();
  today.setDate(today.getDate() + day);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  };
  return today.toLocaleDateString(undefined, options) + " (UTC)";
}

/**
 * Get the current dttm in human readable form, UTC only
 *
 * @param {*} day
 * @returns {string} the UTC dttm in human readable form
 */
function getCurrentDttmUtcHumanReadable() {
  const today = new Date();
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  };
  return today.toLocaleDateString(undefined, options) + " (UTC)";
}

async function getXQueryRuntimeDttm() {
  const a = dayjs();
  const b = a.add(-1, "day");
  return b.format("dddd MMMM D, YYYY (UTC)");
}

/**
 * Returns the start dttm for Twitter API query
 * "2026-01-09_00:00:00_UTC"
 */
async function getXQueryStartDttm() {
  const a = dayjs();
  const b = a.add(-1, "day");
  return b.format("YYYY-MM-DD_00:00:00_UTC");
}

/**
 * Returns the end dttm for Twitter API query
 * "2026-01-14_23:59:59_UTC"
 */
async function getXQueryEndDttm() {
  const a = dayjs();
  const b = a.add(-1, "day");
  return b.format("YYYY-MM-DD_23:59:59_UTC");
}

module.exports = {
  getDateUtcHumanReadable,
  getCurrentDttmUtcHumanReadable,
  getXQueryRuntimeDttm,
  getXQueryStartDttm,
  getXQueryEndDttm,
};
