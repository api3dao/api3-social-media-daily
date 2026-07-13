# Slack

Slack is the most convenient UI to display the list of daily social media posts. The list of posts gathered from all sources are pushed onto a single Slack channel. The posts are rendered using the [Slack block kit](https://docs.slack.dev/block-kit/).

## Setup

- Create a Slack bot named "Seeker".
- Create a channel name `the-daily`.
- Add the "Seeker" bot to the channel `the-daily`.
- Add the "Seeker" bot `auth_token` to the `config.json` file for the `social-media-daily` repo.
- Add the `the-daily` channel id to the `channel` key in the `config.json` file for the `social-media-daily` repo.
