import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from "@solana/spl-token";
import { PROTOCOL_CONFIG } from "../shared/config";
import bs58 from "bs58";

// This class manages the system's Solana wallet and token transactions
export class SolanaManager {
  private connection: Connection;
  private masterKeypair: Keypair | null = null;

  constructor() {
    this.connection = new Connection(PROTOCOL_CONFIG.RPC_URL, "confirmed");
    this.initializeWallet();
  }

  private initializeWallet() {
    // In production, this would load from a secure environment variable/secret
    // For now, we'll provide a way to load it but keep it null to stay in "free/test" mode
    const secretKey = process.env.SOLANA_MASTER_WALLET_KEY;
    if (secretKey) {
      try {
        this.masterKeypair = Keypair.fromSecretKey(bs58.decode(secretKey));
        console.log("Solana Master Wallet initialized:", this.masterKeypair.publicKey.toBase58());
      } catch (err) {
        console.error("Failed to initialize Solana Master Wallet:", err);
      }
    } else {
      console.log("Solana Manager running in TEST mode (No master wallet configured)");
    }
  }

  async sendReward(toAddress: string, amount: number): Promise<string | null> {
    if (!this.masterKeypair) {
      console.log(`[TEST MODE] Would send ${amount} tokens to ${toAddress}`);
      // Return a mock signature for testing
      return "MOCK_SIG_" + Math.random().toString(36).substring(7);
    }

    try {
      const destinationWallet = new PublicKey(toAddress);
      const mint = new PublicKey(PROTOCOL_CONFIG.MINT_ADDRESS);
      
      const sourceAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.masterKeypair,
        mint,
        this.masterKeypair.publicKey
      );

      const destinationAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.masterKeypair,
        mint,
        destinationWallet
      );

      const transaction = new Transaction().add(
        createTransferInstruction(
          sourceAccount.address,
          destinationAccount.address,
          this.masterKeypair.publicKey,
          Math.floor(amount * Math.pow(10, PROTOCOL_CONFIG.DECIMALS))
        )
      );

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.masterKeypair]
      );

      return signature;
    } catch (err) {
      console.error("Failed to send reward:", err);
      throw err;
    }
  }

  async getMasterBalance(): Promise<number> {
    if (!this.masterKeypair) return 0;
    try {
      const mint = new PublicKey(PROTOCOL_CONFIG.MINT_ADDRESS);
      const account = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.masterKeypair,
        mint,
        this.masterKeypair.publicKey
      );
      return Number(account.amount) / Math.pow(10, PROTOCOL_CONFIG.DECIMALS);
    } catch {
      return 0;
    }
  }
}

export const solanaManager = new SolanaManager();
