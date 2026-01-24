import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram } from "@solana/web3.js";
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

  public getMasterPublicKey(): string | null {
    return this.masterKeypair?.publicKey.toBase58() || null;
  }

  async sendReward(toAddress: string, amount: number): Promise<string | null> {
    if (!this.masterKeypair) {
      console.log(`[TEST MODE] Would send ${amount / 1e9} SOL to ${toAddress}`);
      // Return a mock signature for testing
      return "MOCK_SIG_" + Math.random().toString(36).substring(7);
    }

    try {
      const destinationWallet = new PublicKey(toAddress);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.masterKeypair.publicKey,
          toPubkey: destinationWallet,
          lamports: Math.floor(amount)
        })
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

  async verifyTransaction(signature: string, expectedAmount: number, recipient: string): Promise<boolean> {
    if (!this.masterKeypair && signature.startsWith("TEST_TX_SIG_")) {
      return true;
    }

    const maxRetries = 15;
    const retryDelay = 2000;

    console.log(`Verifying transaction: ${signature} for amount ${expectedAmount}`);

    for (let i = 0; i < maxRetries; i++) {
      try {
        const tx = await this.connection.getParsedTransaction(signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0
        });

        if (tx && tx.meta && !tx.meta.err) {
          console.log(`Transaction found: ${signature}`);
          const mint = PROTOCOL_CONFIG.MINT_ADDRESS ? new PublicKey(PROTOCOL_CONFIG.MINT_ADDRESS) : null;

          if (mint) {
            // SPL Token transfer check
            const instructions = tx.transaction.message.instructions;
            for (const ix of instructions) {
              if ("parsed" in ix && ix.program === "spl-token") {
                const { info } = ix.parsed;
                if (ix.parsed.type === "transferChecked" || ix.parsed.type === "transfer") {
                  const amount = ix.parsed.type === "transferChecked" ? info.tokenAmount.amount : info.amount;
                  if (Number(amount) >= expectedAmount) {
                    console.log(`Verification successful: SPL amount matches`);
                    return true;
                  }
                }
              }
            }
          } else {
            // Simple SOL transfer check - check account keys in meta for balance changes
            // This is more reliable than checking instructions for system transfers
            const postBalances = tx.meta.postBalances;
            const preBalances = tx.meta.preBalances;
            const accountKeys = tx.transaction.message.accountKeys;
            
            const recipientIndex = accountKeys.findIndex(key => key.pubkey.toBase58() === recipient);
            
            if (recipientIndex !== -1) {
              const diff = postBalances[recipientIndex] - preBalances[recipientIndex];
              // We check if the recipient's balance increased by at least expectedAmount
              if (diff >= expectedAmount) {
                console.log(`Verification successful: SOL balance increased by ${diff}`);
                return true;
              }
            }
          }
        } else if (tx && tx.meta && tx.meta.err) {
          console.log(`Transaction failed on-chain: ${signature}`);
          return false;
        }
      } catch (err) {
        console.error(`Verification attempt ${i + 1} failed:`, err);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    console.log(`Verification timed out after ${maxRetries} attempts`);
    return false;
  }

  async getMasterBalance(): Promise<number> {
    if (!this.masterKeypair) return 0;
    try {
      const mint = PROTOCOL_CONFIG.MINT_ADDRESS ? new PublicKey(PROTOCOL_CONFIG.MINT_ADDRESS) : null;
      if (mint) {
        const account = await getOrCreateAssociatedTokenAccount(
          this.connection,
          this.masterKeypair,
          mint,
          this.masterKeypair.publicKey
        );
        return Number(account.amount) / Math.pow(10, PROTOCOL_CONFIG.DECIMALS);
      } else {
        const balance = await this.connection.getBalance(this.masterKeypair.publicKey);
        return balance / 1e9;
      }
    } catch {
      return 0;
    }
  }
}

export const solanaManager = new SolanaManager();
