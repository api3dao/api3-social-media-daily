/**
 * Posts made to x/Twitter channels
 */

const fs = require("fs");
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const logger = require("../utils/logger");
const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"))[
  process.env.NODE_ENV
];

console.log("Loading xPost.js...");

/**
 * Api3Dao tweets are posted to the Discord channel twitter-posts
 * @param {*} tweet
 */
async function postChannelTwitterPosts(tweet) {
  console.log(">>>", tweet.author.userName);
  console.log(">>>", tweet.url);
  try {
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    });
    await client.login(config.discord.auth_token);
    const channel = await client.channels.fetch(
      config.discord.channel_twitter_posts,
    );

    await channel.send(tweet.url);

    await client.destroy();
  } catch (error) {
    logger.error("Discord channel twitter-posts:", error);
  }
}

module.exports = { postChannelTwitterPosts };
