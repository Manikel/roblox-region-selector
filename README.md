# Roblox Region Selector
An open source tool I made to select Roblox region based on your preference.

## Overview

This project provides a free alternative to existing paid solutions by enabling manual server region selection for Roblox games. The extension intercepts server selection requests and routes connections to user-specified regions.

## Features

- Multiple server region options (US East/West/Central, EU West/Central, Asia Pacific/East)
- Persistent user preferences
- Automatic integration with Roblox game pages
- Open source implementation
- No data collection or tracking

## Development Status

**Phase 1: Extension Framework** (Complete)
- Chrome extension manifest and popup interface
- Region selection UI components
- Settings persistence system
- Content script injection

**Phase 2: Network Integration** (In Progress)
- Research Roblox server selection API
- Implement request interception
- Test region forcing functionality
- Handle edge cases and fallbacks

**Phase 3: Testing and Deployment** (Planned)
- User testing and feedback integration
- Performance optimization
- Error handling and logging
- Chrome Web Store preparation

## Technical Implementation

Built with JavaScript, HTML/CSS, and Chrome Extensions API. Uses Chrome's DeclarativeNetRequest API for network request modification and Storage API for user preferences.

## Installation

1. Clone this repository
2. Navigate to `chrome://extensions/` in Chrome
3. Enable Developer mode
4. Select "Load unpacked" and choose the project directory
5. The extension will appear in the browser toolbar

## Architecture

The extension operates by detecting Roblox game pages, intercepting server selection requests, and modifying those requests to target user-specified regions. This ensures game connections route through the preferred geographic location.

## Development Notes

Key technical challenges include reverse engineering Roblox's server selection API and implementing reliable request interception without breaking existing functionality. The project requires understanding of web APIs, browser extension architecture, and network request manipulation.

## License

MIT License

## Disclaimer

This project is developed for educational purposes and is not affiliated with Roblox Corporation. The extension does not modify game files or provide gameplay advantages.
