# Introduction

The repo `social-media-daily` runs once a day (on an EC2 instance) at `00:05:00 UTC` and pushes information to the Slack **Seeker** app. Its purpose is to gather social media information deemed important to Api3 staff for the UTC date prior to execution, the previous day. The results of each run cycle are posted on the Slack channel `the-daily`.

## Workflow

1. X/Twitter posts are gathered into a list.
2. The X/Twitter list is sent to the Slack channel `the-daily`.
3. Meaningful Discord and Telegram messages are gathered and sorted into a single list.
4. The Discord and Telegram list is sent to the Slack channel `the-daily`.

All Slack posts are formatted using the [Slack block kit](https://docs.slack.dev/block-kit/).
