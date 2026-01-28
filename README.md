# Page Digest

[![Release](https://github.com/joanfabregat/page-digest/actions/workflows/release.yml/badge.svg)](https://github.com/joanfabregat/page-digest/actions/workflows/release.yml)
[![Version](https://img.shields.io/github/package-json/v/joanfabregat/page-digest)](https://github.com/joanfabregat/page-digest/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Chrome extension that extracts article content from web pages and sends it to your preferred AI assistant (ChatGPT, Gemini, or Claude) for summarization.

## Features

- **One-click summarization**: Click the extension icon to instantly send the current page to your AI
- **Multiple AI providers**: Choose between ChatGPT, Gemini, or Claude
- **Smart content extraction**: Uses Mozilla Readability to extract clean article content
- **Quality detection**: Warns you when content extraction is poor (e.g., on non-article pages)
- **Automatic submission**: Opens the AI chat and automatically submits the content
- **Lightweight**: Background service worker only runs when needed, no persistent resource usage

## Installation

1. Clone this repository or download the source code
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the content script
4. Open Chrome and go to `chrome://extensions/`
5. Enable "Developer mode" in the top right
6. Click "Load unpacked" and select the extension directory

## Usage

1. Navigate to any article or webpage you want to summarize
2. Click the Page Digest icon in your browser toolbar
3. The extension will:
   - Extract the main content from the page
   - Warn you if content quality is poor (optional to continue)
   - Open your configured AI provider in a new tab
   - Paste the content with summarization instructions
   - Automatically submit the request

## Configuration

Right-click the extension icon and select "Options" to configure:

- **ChatGPT** (default): Uses OpenAI's ChatGPT
- **Gemini**: Uses Google's Gemini
- **Claude**: Uses Anthropic's Claude

## System Prompt

The extension sends the following instructions to the AI:

> Summarize this article concisely. Keep the same language as the source. Use bullet points for key takeaways. Be brief but don't miss critical information.

## Permissions

- **activeTab**: To read content from the current page
- **scripting**: To extract article text and interact with AI pages
- **storage**: To save your AI provider preference

## Privacy

- No data collection or tracking
- All processing happens locally in your browser
- Content is only sent to your chosen AI provider
- See [PRIVACY.md](PRIVACY.md) for full details

## Development

```bash
# Install dependencies
npm install

# Build content script
npm run build

# Watch for changes
npm run watch

# Package for distribution
npm run pack
```

## License

MIT
