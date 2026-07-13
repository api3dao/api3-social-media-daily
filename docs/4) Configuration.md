# Configuration

The `config.json` file for the app can be found on Keybase which contains keys and tokens. See the repo owner for access.

```json
{
  "development": {
    "slack": {
      "auth_token": "<token>",
      "channel": "<id>"
    },
    "x": {
      "twitter_api_io_key": "<key>",
      "queries": [
        "(from:@Morpho include:nativeretweets -filter:replies)",
        "(from:@Api3DAO include:nativeretweets -filter:replies)",
        ...
      ]
    }
  },
  "production": {
    "slack": {
      "auth_token": "<token>",
      "channel": "<id>"
    },
    "x": {
      "twitter_api_io_key": "<key>",
      "queries": [
        "(from:@Morpho include:nativeretweets -filter:replies)",
        "(from:@Api3DAO include:nativeretweets -filter:replies)",
        ...
      ]
    }
  },
  "pushover": {
    "enabled": true,
    "url": "<url>",
    "production": {
      "group_key": "<key>>",
      "api_token": "<token>"
    },
    "development": {
      "group_key": "<key>",
      "api_token": "<token>"
    }
  }
}
```

## Keys

Root keys can be for development, production, or pushover. Pushover uses it own keys for development and production. Both development and production keys have the same meaning.

### `slack.auth-token`

The Slack authorization token for the Slack app (Seeker) used to access the `channel` key.

### `slack.channel`

The Slack channel id where messages are sent.

### `x.twitter_api_io_key`

The key provided by [twitterapi.io](https://twitterapi.io/). The key provides access their Twitter/X data warehouse via their APIs.

### `x.queries`

An array of query strings to feed the advanced search from [twitterapi.io](https://twitterapi.io/). Each row is executed separately. For more on formatting see [igorbrigadir/twitter-advanced-search](https://github.com/igorbrigadir/twitter-advanced-search).

### `pushover.enabled`

Activates Pushover for both development and production.

### `pushover.url`

The Pushover URL to post messages to.

## `pushover.production.group_key`

The key that tells Pushover which group to add the message to inside its mobile app.

## `pushover.production.api_token`

The token used to authenticate calls to `pushover.url`.
