
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo, useEffect } from 'react';
import { useSound } from '@/contexts/SoundContext';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

const AudioInitializer = ({ children }: { children: React.ReactNode }) => {
    const { playSound } = useSound();
    const { connected } = useWallet();

    useEffect(() => {
        if (connected) {
            // Play a silent sound or a very short one to unlock audio context
            // Many browsers unlock audio after any user-initiated play() call
            playSound("/sounds/tick.mp3", 0.01);
        }
    }, [connected, playSound]);

    return <>{children}</>;
};

export const SolanaProvider = ({ children }: { children: React.ReactNode }) => {
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <AudioInitializer>
                        {children}
                    </AudioInitializer>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
