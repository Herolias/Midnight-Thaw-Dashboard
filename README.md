# Midnight Thaw Tracker

A beautiful, local web dashboard to track your **Midnight (NIGHT)** token thaw schedules and claimable amounts across multiple wallets.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

## Features

- **Visual Dashboard** - Track unlocking schedules with interactive charts
- **Multi-Wallet Support** - Monitor multiple wallet addresses at once
- **Live Price Data** - Real-time NIGHT token pricing from CoinGecko
- **Custom Names** - Label your wallets for easy identification
- **Thaw Timeline** - See exactly when tokens become redeemable vs. redeemed

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) version 18 or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/midnight-thaw-tracker.git
   cd midnight-thaw-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser** to [http://localhost:3000](http://localhost:3000)

### One-Click Start (Alternative)

- **Windows**: Double-click `start.bat`
- **Linux/macOS**: Run `./start.sh` (you may need to `chmod +x start.sh` first)

## Configuration

Wallets can be added directly through the web interface. Alternatively, you can manually edit `config.json`:

1. Copy the example config:
   ```bash
   cp config.example.json config.json
   ```

2. Edit `config.json` with your wallet addresses:
   ```json
   [
     {
       "address": "addr1qx...",
       "name": "My Main Wallet"
     }
   ]
   ```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wallets` | GET | Get all monitored wallets with thaw data |
| `/api/wallets` | POST | Add a new wallet |
| `/api/wallets` | PUT | Update wallet name |
| `/api/wallets` | DELETE | Remove a wallet |
| `/api/lookup?address=...` | GET | Lookup specific wallet |
| `/api/price` | GET | Get current NIGHT price |

## Donate

If you find this tool useful, consider donating Night/ADA to support future tool developments:

- **Donation Address**: `addr1q8vnrdd8n67sl2ft6gtdd4q88sl9k8gszex85r2ar6vx0ygsv7qfl2pu8ut9535655umtpkuwfmrys4jmpxzyaj09qcscmajeq`

