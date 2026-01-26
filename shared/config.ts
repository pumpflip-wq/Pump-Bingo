export const PROTOCOL_CONFIG = {
  // Replace with your actual Token Mint Address (CA)
  MINT_ADDRESS: null, // Set to null for SOL mode, or provide CA for SPL token
  SYMBOL: "$PUMP",
  DECIMALS: 9, // Standard SPL/SOL decimals

  // Game Settings
  DEFAULT_ENTRY_PRICE: 1000 * 1e9, // Default entry price (updated for SPL token context)
  FEE_PERCENTAGE: 0, // No fees as requested

  // Links
  PUMP_FUN_URL: "https://pump.fun/",
  DEXSCANNER_URL: "https://dexscreener.com/solana/",
  TWITTER_URL: "https://x.com/pumpbingo",
  TELEGRAM_URL: "https://t.me/pumpbingo",

  // Mainnet Configuration
  NETWORK: "mainnet-beta",
  RPC_URL: "https://mainnet.helius-rpc.com/?api-key=dd4d0f55-719e-4f2e-b8b8-2f686bc7d2bf",
  BACKUP_RPC_URL: "https://api.mainnet-beta.solana.com",
  IS_TEST_MODE: false, // REAL TRANSACTIONS ENABLED

  // Admin wallet address
  ADMIN_WALLET: "23caHs1DUE8Qh5G2fLtKGUtEicahB4roGhiedp7zWg4Z",
};
