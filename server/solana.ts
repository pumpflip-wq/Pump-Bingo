import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from "@solana/spl-token";
import { PROTOCOL_CONFIG } from "../shared/config";
import bs58 from "bs58";

// This class manages the system's Solana wallet and token transactions
export class SolanaManager {
  private connection: Connection;
  private masterKeypair: Keypair | null = null;

  constructor() {
    this.connection = new Connection(PROTOCOL_CONFIG.RPC_URL, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000
    });
    this.initializeWallet();
    this.setupBackupConnection();
  }

  private setupBackupConnection() {
    // Try to ping the primary RPC, if it fails, we have the backup URL ready for failover logic
    this.connection.getSlot().catch(() => {
      if (PROTOCOL_CONFIG.BACKUP_RPC_URL) {
        console.warn("[SolanaManager] Primary RPC failed, prepared to switch to backup");
        this.connection = new Connection(PROTOCOL_CONFIG.BACKUP_RPC_URL, "confirmed");
      }
    });
  }

  private initializeWallet() {
    const secretKey = process.env.SOLANA_MASTER_WALLET_KEY;
    if (secretKey) {
      try {
        this.masterKeypair = Keypair.fromSecretKey(bs58.decode(secretKey));
        console.log("[SolanaManager] Master wallet initialized:", this.masterKeypair.publicKey.toBase58());
      } catch (err) {
        console.error("Failed to initialize Solana Master Wallet:", err);
      }
    } else {
      console.warn("[SolanaManager] SOLANA_MASTER_WALLET_KEY missing. System in standby.");
    }
  }

  public getMasterPublicKey(): string | null {
    return this.masterKeypair?.publicKey.toBase58() || null;
  }

  async sendReward(toAddress: string, amount: number): Promise<string | null> {
    if (amount <= 0) {
      console.log(`[SolanaManager] Skipping zero amount reward for ${toAddress}`);
      return "FREE_MODE_NO_PAYOUT";
    }

    if (!this.masterKeypair) {
      console.log(`[SolanaManager] No master wallet - returning mock signature for ${amount} to ${toAddress}`);
      return "MOCK_SIG_" + Math.random().toString(36).substring(7);
    }

    try {
      const destinationWallet = new PublicKey(toAddress);
      const mint = PROTOCOL_CONFIG.MINT_ADDRESS ? new PublicKey(PROTOCOL_CONFIG.MINT_ADDRESS) : null;
      
      let transaction: Transaction;
      
      if (mint) {
        // SPL Token transfer for MAINNET with custom token
        console.log(`[SolanaManager] Sending SPL token reward: ${amount} to ${toAddress}`);
        
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
        
        transaction = new Transaction().add(
          createTransferInstruction(
            sourceAccount.address,
            destinationAccount.address,
            this.masterKeypair.publicKey,
            BigInt(Math.floor(amount))
          )
        );
      } else {
        console.log(`[SolanaManager] Sending SOL reward: ${amount} lamports to ${toAddress}`);
        
        transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: this.masterKeypair.publicKey,
            toPubkey: destinationWallet,
            lamports: Math.floor(amount)
          })
        );
      }

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.masterKeypair]
      );
      
      console.log(`[SolanaManager] Reward sent successfully: ${signature}`);
      return signature;
    } catch (err) {
      console.error("[SolanaManager] Failed to send reward:", err);
      throw err;
    }
  }

  async verifyTransaction(signature: string, expectedAmount: number, recipient: string): Promise<boolean> {
    if (!signature || signature.startsWith("MOCK_SIG_")) return false;
    
    const conn = this.connection;
    
    // For mainnet, we need real verification
    try {
      const status = await conn.getSignatureStatus(signature, { searchTransactionHistory: true });
      if (status?.value?.err) {
        console.error(`[SolanaManager] Transaction ${signature} failed on-chain`);
        return false;
      }
      
      if (status?.value?.confirmationStatus === 'confirmed' || status?.value?.confirmationStatus === 'finalized') {
        return true;
      }
    } catch (e) {
      console.error(`[SolanaManager] Error verifying transaction ${signature}:`, e);
    }

    return false; 
  }

  async getMasterBalance(): Promise<number> {
    if (!this.masterKeypair) return 0;
    try {
      const mint = PROTOCOL_CONFIG.MINT_ADDRESS ? new PublicKey(PROTOCOL_CONFIG.MINT_ADDRESS) : null;
      if (mint) {
        const ata = await getOrCreateAssociatedTokenAccount(
          this.connection,
          this.masterKeypair,
          mint,
          this.masterKeypair.publicKey
        );
        return Number(ata.amount) / Math.pow(10, PROTOCOL_CONFIG.DECIMALS);
      } else {
        const balance = await this.connection.getBalance(this.masterKeypair.publicKey);
        return balance / 1e9; // Solana lamports to SOL
      }
    } catch (err) {
      console.error("[SolanaManager] Failed to get balance:", err);
      return 0;
    }
  }
}

export const solanaManager = new SolanaManager();
