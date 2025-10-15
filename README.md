# Roblox Region Selector

A free, open-source Chrome extension that allows you to select your preferred Roblox server region for better ping and gaming experience.

## Overview

This project provides a free alternative to existing paid solutions by enabling manual server region selection for Roblox games. The extension intelligently searches for and connects you to servers in your chosen geographic region, ensuring optimal latency and performance.

## Features

- **18+ Server Regions**: Choose from multiple locations across US, Europe, and Asia-Pacific
  - United States: Seattle, Los Angeles, Dallas, Chicago, Atlanta, Miami, Ashburn, New York City
  - Europe: London, Amsterdam, Paris, Frankfurt, Warsaw
  - Asia-Pacific: Mumbai, Tokyo, Singapore, Sydney
- **Smart Tab Detection**: Extension controls are only enabled when on Roblox
- **Seamless Integration**: Intercepts the play button when a region is selected
- **Custom Search UI**: Shows a modern overlay while finding your preferred server
- **Automatic Joining**: Automatically connects to the first available server in your region
- **Persistent Preferences**: Your region choice is saved across browser sessions
- **Auto Mode**: Reset to default Roblox behavior anytime
- **Privacy-Focused**: No data collection, tracking, or external API calls
- **Lightweight**: Minimal performance impact on browsing

## How It Works

1. **Tab Detection**: Opens on Roblox? Controls enabled. Otherwise, grayed out.
2. **Region Selection**: Choose your preferred region from the popup (or leave on Auto)
3. **Play Button Interception**: Click play on any game with a region selected
4. **Server Search**: Extension searches public servers for your chosen region
5. **Automatic Join**: Found a match? Joins automatically. Roblox's popup never appears.
6. **Auto Mode**: Set to Auto? Play button works normally, no interception.

## Technical Implementation

### Architecture

The extension uses a multi-layered approach:

- **Popup (popup.html/js)**: User interface for region selection with real-time tab detection
- **Content Script (content.js)**: Manages server search logic and custom UI overlay
- **Page Injector (injector.js)**: Intercepts play button clicks and accesses Roblox's internal game launcher
- **Background Worker (background.js)**: Handles API requests and IP-to-region mapping

### How Server Selection Works

1. **Fetch Server List**: Queries `games.roblox.com/v1/games/{placeId}/servers/Public` for available servers
2. **Get Server Details**: Makes POST requests to `gamejoin.roblox.com/v1/join-game-instance` with modified User-Agent
3. **Extract IP Address**: Retrieves server IP from the `UdmuxEndpoints` response field
4. **Match Region**: Compares IP against hardcoded CIDR ranges for each region
5. **Join Server**: Uses `Roblox.GameLauncher.joinGameInstance()` to connect

### Key Technologies

- **Manifest V3**: Latest Chrome extension standard
- **DeclarativeNetRequest API**: For User-Agent header modification
- **Chrome Storage API**: Persistent preference storage
- **Message Passing**: Communication between extension contexts
- **Event Interception**: Capture phase event listeners to override Roblox handlers

## Installation

### From Source (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/roblox-region-selector.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top-right corner)

4. Click **"Load unpacked"** and select the project directory

5. The extension icon will appear in your browser toolbar

6. Navigate to any Roblox game page and click the extension icon to set your region

## Usage

1. **Open the Extension**: Click the extension icon in your browser toolbar
2. **Check Status**: If on Roblox, controls will be enabled. If not, you'll see a warning.
3. **Select Region**: Choose your preferred server region from the dropdown
4. **Apply**: Click the "Apply" button to save your preference
5. **Play**: Navigate to any Roblox game and click the play button
6. **Automatic Search**: Extension will search for and join a server in your region
7. **Reset**: Click "Reset" to return to Roblox's default server selection

## Credits

This project was made possible by the open-source community and publicly available documentation:

- **Server Region Mapping**: Based on [BTRoblox](https://github.com/AntiBoomz/BTRoblox) IP range data
- **API Documentation**: Roblox Developer Forum guides on server selection
- **Implementation Inspiration**: Various open-source Roblox extension projects

## Contributing

Contributions are welcome! Feel free to:
- Report bugs or issues
- Suggest new features or regions
- Submit pull requests
- Improve documentation

## License

MIT License - see [LICENSE](LICENSE) file for details

## Disclaimer

This project is developed for educational purposes and is not affiliated with, endorsed by, or sponsored by Roblox Corporation. The extension does not modify game files, provide gameplay advantages, or violate Roblox's Terms of Service. Use at your own discretion.

## Support

If you find this project helpful, consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs or issues
- 💡 Suggesting improvements
- 🔄 Sharing with others who might benefit

---

**Note**: This extension requires an active internet connection and may not work if Roblox changes their API structure. Server availability varies by region and game popularity.
