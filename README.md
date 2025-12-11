# HyperCopy Trade Sharer Documentation 👀

## Overview
HyperCopy Trade Sharer is a mini-app built for the Entire Hyperliquid Ecosystem, leveraging Based.One trading terminal, it is integrated with Hyperliquid's API. enabling users automatically copy trades of traders on BasedOne terminal, Hyperliquid itself or any other protocol leveraging Hyperliquid Builder code, so long as the trade settles on Hyperliquid you can copy it from this tool, doesn't matter which User interface the wallet uses to place the trade or particular product leveraging the Builder code, could be Phantom, Dexari, PvP Trade e.t.c, Provided it settles on Hyperliquid you can automatically copy trades from the most profitable wallets accross them all in real-time, while exceptional traders can earn fees through referral codes. This creates a win-win ecosystem where followers benefit from expert strategies, and leaders monetize their success.

- App URL: https://hypercopy-trade-sharer-frontend.vercel.app

- Version: 1.0.0

- Developer: JonahJoseMaria (GitHub: https://github.com/0ncharted)
- Supported Networks: Hyperliquid Testnet and Mainnet (auto-detects based on terminal environment)
- Dependencies: @basedone/miniapp-sdk (for terminal integration), MongoDB (for referral storage via backend)

The app leverages the Based.One SDK for wallet connections, permissions, and order placement, while fetching real-time trade data from Hyperliquid's API. The backend handles referral registration and verification using MongoDB Atlas.
Features

## Follower Mode (Copy Trades)
Automatically mirror a leader's trades at a customizable ratio (e.g., 50% of their size). Supports market orders with real-time polling for fills and position closes.
## Leader Mode (Register Wallet)
Register your wallet with a unique referral code to allow followers to copy you, earning fees from their trades.
## Optional Referral System
Even without a Referral link you can still copy a trade effortlessly as our referral code verification to ensure only authorized followers copy a wallet is currently optional for now. referral links are all Stored securely in MongoDB. 

## How to Use the App
### Prerequisites
- Access the app inside the Based.One trading terminal by simply installing from the Based.one minnniapp Store.
- Have a your regular EVM wallet funded and connected in the terminal and you are instantly good to go.
### For leaders:
Provide your unique referral code (e.g., "GODSEYE") and your wallet address. (we intend to leverage this when rolling out more updates that is guaranteed to help leaders earn significantly more % of fees)
### For followers:
Provide a leader's wallet address (and optional referral code). and you instantly start copying any trade (even beyond Based.One Termainal) the leader makes that settles on Hyperliquid is copied.

## Step-by-Step User Guide

### Follower Mode (Copy Trades):
- Select "Follower (Copy Trades)" from the mode dropdown.
- Enter the leader's wallet address.
- (Optional) Enter the leader's referral code for verification.
- Adjust the copy ratio slider (10-200% of leader's trade size).
- Click "Start Copying".
- The app requests permissions via Based.One SDK (place_orders, etc.).
- Polling starts: Fetches fills and states every 3 seconds from Hyperliquid API.
- Trades mirror automatically (market orders only).
- Output log shows polled data, new trades, and copies.
- Click "Stop Copying" to pause.

# ROADMAP 
### Top Traders Leaderboard: 
Scrapes Our Database of Leader's Referral links or Hyperliquid's leaderboard for top PNL wallets, showing ranks, wallets, PNL, and associated referral codes (if registered) to allow easier access to copying of the best traders.
