---
name: telegram-jorge
description: "Send messages or images to Jorge's Telegram chat. Use when the user wants to send a notification, message, or image to Jorge via Telegram."
---

# Telegram - Send to Jorge

## Overview

Send text messages or images to Jorge's Telegram chat using the Telegram Bot API.

## Required Environment Variables

The following environment variables must be set in `.env`:

- `TELEGRAM_BOT_TOKEN` — Bot token from @BotFather
- `TELEGRAM_CHAT_ID` — Jorge's chat ID (already configured)
- `TELEGRAM_RECIPIENT_NAME` — Recipient name for confirmation (already configured)

## How to Send a Text Message

Use the Bash tool to make a curl request to the Telegram Bot API:

```bash
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"text\": \"MESSAGE_HERE\", \"parse_mode\": \"Markdown\"}"
```

### Steps:

1. Load the environment variables from `.env`:
   ```bash
   source <(grep -E '^TELEGRAM_' .env | sed 's/^/export /')
   ```
2. Confirm with the user what message they want to send before sending it.
3. Send the message using curl.
4. Check the response — `"ok":true` means success.
5. Report back to the user that the message was delivered to the recipient (use `TELEGRAM_RECIPIENT_NAME`).

## How to Send an Image

### From a local file:

```bash
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto" \
  -F "chat_id=${TELEGRAM_CHAT_ID}" \
  -F "photo=@/path/to/image.jpg" \
  -F "caption=Optional caption here"
```

### From a URL:

```bash
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"photo\": \"IMAGE_URL_HERE\", \"caption\": \"Optional caption\"}"
```

### Steps:

1. Load the environment variables from `.env`.
2. Confirm with the user what image and optional caption they want to send.
3. If a local file path is provided, use the multipart form approach (`-F`).
4. If a URL is provided, use the JSON approach.
5. Check the response for success.
6. Report back to the user.

## How to Send a Document/File

```bash
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument" \
  -F "chat_id=${TELEGRAM_CHAT_ID}" \
  -F "document=@/path/to/file.pdf" \
  -F "caption=Optional caption here"
```

## Supported Markdown Formatting (parse_mode: Markdown)

- `*bold*`
- `_italic_`
- `` `inline code` ``
- ``` ```code block``` ```
- `[link text](URL)`

## Important Rules

1. **ALWAYS confirm the message content with the user before sending.** Never send without approval.
2. **ALWAYS load env vars** from `.env` before making API calls.
3. If `TELEGRAM_BOT_TOKEN` is not set, inform the user they need to:
   - Create a bot via [@BotFather](https://t.me/BotFather) on Telegram
   - Add the token to `.env` as `TELEGRAM_BOT_TOKEN=your-token-here`
4. On error, show the API response to help debug.
5. Keep messages concise and useful — avoid sending walls of text.
