export const PROTOCOL_CONFIG = {
  // Replace with your actual Token Mint Address (CA)
  MINT_ADDRESS: null, // Set to null for SOL mode
  SYMBOL: "$PBINGO",
  DECIMALS: 9, // SOL has 9 decimals

  // Game Settings
  DEFAULT_ENTRY_PRICE: 0.1 * 1e9, // 0.1 SOL in lamports
  FEE_PERCENTAGE: 0, // No fees initially to maximize engagement

  // Links
  PUMP_FUN_URL: "https://pump.fun/",
  DEXSCANNER_URL: "https://dexscreener.com/solana/",
  TWITTER_URL: "https://x.com/pumpbingo",
  TELEGRAM_URL: "https://t.me/pumpbingo",

  // Devnet/Mainnet toggle (currently using Devnet)
  NETWORK: "devnet",
  RPC_URL: "https://api.devnet.solana.com",
  IS_TEST_MODE: false, // Set to false to enable real transactions

  // Admin wallet address - change this to set a new admin
  ADMIN_WALLET: "23caHs1DUE8Qh5G2fLtKGUtEicahB4roGhiedp7zWg4Z",
  TREASURY_WALLET: "23caHs1DUE8Qh5G2fLtKGUtEicahB4roGhiedp7zWg4Z", // User's master wallet
};
