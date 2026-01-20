# PUMP BINGO

## Overview

PUMP BINGO is a real-time multiplayer Bingo game built on Solana blockchain. The application features a modern, cyberpunk-inspired UI with neon green and purple theming, inspired by Pump.fun aesthetics. Players connect their Solana wallets, join bingo rounds with a fixed buy-in, and compete for prize pools in a provably fair gaming system.

The core gameplay loop involves automated round creation, player matchmaking, random number drawing with cryptographic fairness verification, and winner determination with prize distribution.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state with polling-based real-time updates
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for game animations, canvas-confetti for winner celebrations
- **Wallet Integration**: Solana Wallet Adapter supporting Phantom and Solflare wallets

The frontend uses a monolithic single-page application structure with pages for Home, Login, and GameRoom. Components are organized by feature (game-specific) and UI (reusable shadcn components).

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: REST endpoints defined in shared/routes.ts with Zod validation schemas
- **Game Loop**: Server-side GameManager class running a 1-second tick interval for round management
- **Build System**: Custom esbuild + Vite build script bundling server dependencies for optimized cold starts

The backend serves both the API and static files in production. In development, Vite middleware provides HMR for the frontend.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Four main tables - users, rounds, participants, transactions
- **Migrations**: Drizzle Kit for schema push (db:push command)

Key schema design decisions:
- Users are identified by wallet address (stored as username)
- Rounds track game state (OPEN, STARTING, IN_GAME, FINISHED), provably fair seeds, and drawn numbers
- Participants store individual bingo cards as JSONB and link users to rounds
- Transactions log all buy-ins and prize payouts

### Authentication
- Wallet-based authentication using Solana wallet addresses
- No traditional session management - user ID stored in localStorage
- Backend creates user records on first wallet connection

### Provably Fair System
- Server generates cryptographic seed before each round
- SHA256 hash of seed shown to players before game starts
- Full seed revealed after round completion for verification

## External Dependencies

### Blockchain Integration
- **Solana Web3.js**: Core Solana blockchain interaction
- **Wallet Adapters**: @solana/wallet-adapter-react, @solana/wallet-adapter-wallets
- Currently configured for Devnet; uses SPL tokens for game currency

### Database
- **PostgreSQL**: Primary data store (requires DATABASE_URL environment variable)
- **Drizzle ORM**: Type-safe database queries and schema management
- **pg**: Node.js PostgreSQL client

### UI Component Libraries
- **Radix UI**: Accessible primitive components (dialogs, dropdowns, tooltips, etc.)
- **shadcn/ui**: Pre-built component patterns using Radix + Tailwind
- **Lucide React**: Icon library

### Animation & Effects
- **Framer Motion**: Complex animations for game elements
- **canvas-confetti**: Winner celebration effects

### Development Tools
- **Vite**: Frontend dev server and build tool with HMR
- **esbuild**: Fast server bundling for production
- **Replit plugins**: Runtime error overlay, cartographer, dev banner