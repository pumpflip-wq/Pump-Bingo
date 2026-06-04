export const PROTOCOL_CONFIG = {
  MINT_ADDRESS: "A3yCeYbaCWNVbdCceA1zkMKtQ3T2831X8esHj4shpump",
  SYMBOL: "$PBINGO",
  DECIMALS: 6,

  // Game Settings
  DEFAULT_ENTRY_PRICE: 0 * 1e6,       // FREE lobby entry price (always 0)
  PAID_ENTRY_PRICE: 100000 * 1e6,     // PAID lobby entry price (100,000 $PBINGO)
  FEE_PERCENTAGE: 10,                  // 10% protocol fee on prize pools

  // Links
  PUMP_FUN_URL: "https://pump.fun/coin/",
  DEXSCANNER_URL: "https://dexscreener.com/solana/",
  TWITTER_URL: "https://x.com/PumpBingo_fun",

  // Mainnet Configuration
  NETWORK: "mainnet-beta",
  RPC_URL:
    (typeof process !== "undefined" && process.env?.SOLANA_RPC_URL) ||
    "https://api.mainnet-beta.solana.com",
  BACKUP_RPC_URL: "https://api.mainnet-beta.solana.com",

  // Admin wallet address (treasury — receives entry fees and sends prizes)
  ADMIN_WALLET: "23caHs1DUE8Qh5G2fLtKGUtEicahB4roGhiedp7zWg4Z",
  POST_WIN_DELAY_MS: 10000,
};
