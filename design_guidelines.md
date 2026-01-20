# Solana Bingo Game - Design Guidelines

## Design Approach
**Reference-Based: Pump.fun Aesthetic** - High-energy meme platform meets crypto gaming. Inspired by Pump.fun's playful chaos, bold typography, and "number go up" energy. Think memecoin launch excitement with structured gameplay. Professional enough for real money, fun enough for degens.

## Color Palette
- **Primary Action:** Neon Green `#22c55e` (buttons, winning states, highlights)
- **Accent:** Pump Pink `#ec4899` (prizes, multipliers, special states)
- **Background:** Deep Black `#09090b` (base layer)
- **Surfaces:** `#1a1a1f` (cards, panels)
- **Borders/Dividers:** `#27272a` with green/pink glow accents

## Typography
**Font Stack:**
- Primary: 'Space Grotesk' (700-800 for headings, 600 for buttons/labels)
- Secondary: 'DM Sans' (500-600 for body, instructions, UI text)
- Numbers: 'JetBrains Mono' (700 for bingo numbers, wallet balances, prize amounts)

**Hierarchy:**
- Game Logo/Headers: text-6xl md:text-7xl, font-extrabold, uppercase
- Called Numbers: text-5xl md:text-6xl, monospace, font-bold
- Bingo Card Numbers: text-3xl md:text-4xl, monospace, bold
- Prize Amounts: text-4xl md:text-5xl, monospace, gradient text effect
- Body Text: text-base md:text-lg, leading-relaxed
- Micro Data: text-sm, font-medium

## Layout System
**Spacing:** Tailwind units of 4, 6, 8, 12, 16, 24
- Mobile-first: p-4, gap-6 on small screens
- Desktop: p-8, gap-12 for sections
- Card spacing: space-y-6
- Grid gaps: gap-4 md:gap-6

**Grid Structure:**
- Mobile: Single column, stacked components
- Desktop: 3-column (sidebar-main-sidebar) with bingo card centered, 70% width main area

## Component Library

**Header:**
Sticky top bar with backdrop-blur-xl, dark background. Includes: SOL balance (large monospace text with green), wallet button (neon green with black text, rounded-full), meme-style logo text ("BINGO DEGEN" or similar), hamburger menu mobile.

**Bingo Card:**
Centered, prominent card with sharp rounded corners (rounded-2xl). Background gradient from dark surface to slightly lighter. 5x5 grid with thick borders between cells. Each cell: large monospace number, centered. Called numbers: bright green background with scale animation. FREE space: pink gradient with icon. Winning pattern: animated green glow outline pulsing.

**Number Call Display:**
Large horizontal banner showing latest called number (giant text, green glow, brief flash animation). Below: scrolling horizontal chips of previously called numbers (pill-shaped, green borders, dark bg).

**Prize Pool Section:**
Eye-catching panel with gradient border (green to pink). Giant SOL amount with animated counter, sparkle effects on change. Prize tiers in grid cards: 2-column mobile, 3-column desktop. Each tier shows pattern type, SOL amount (pink text), and odds (small gray text).

**Buy Card Button:**
Massive, impossible-to-miss CTA. Full-width mobile, prominent desktop. Neon green background, black text, bold font, rounded-full, thick border, shadow-2xl with green glow. Text: "BUY CARD - 0.1 SOL" or similar.

**Game Status Bar:**
Top banner (below header) with round timer (circular progress ring, green), current round number, players active count. On mobile: compact horizontal layout.

**Transaction Feed:**
Side panel (desktop) or bottom drawer (mobile). Shows recent activity: "🔥 Player won 5 SOL!", "Called: B-12", transaction confirmations. Each item: compact card with timestamp, pill-shaped badges for transaction type.

**Leaderboard:**
Cards showing top 5 players. Each card: rank badge (gradient circle, pink/green), truncated wallet address (monospace), wins count (green number), total SOL won (large pink number). Stack mobile, 2-column tablet, single column in sidebar desktop.

**Footer:**
Compact section with Solana logo, "Powered by Solana" text, smart contract address (click to copy, monospace), links to rules/FAQ, social icons (X, Discord, Telegram). Simple horizontal layout mobile, spread out desktop.

## Images

**Hero Background (Welcome/Lobby Screen):**
Abstract neon grid cityscape with pink and green light streaks. Think Pump.fun's playful geometric patterns meets Tron-style digital landscape. Full viewport height with dark gradient overlay (bottom to top, black to transparent) ensuring text readability. Position main CTAs ("ENTER GAME", "CONNECT WALLET") over this background with backdrop-blur-lg backgrounds.

**Pattern Overlays:**
Subtle dot matrix or grid pattern at 3% opacity across dark surfaces for texture depth without distraction.

## Visual Treatment
- Glass morphism on all panels: backdrop-blur-lg, semi-transparent backgrounds
- Borders: 2px green or pink on interactive elements
- Glows: box-shadow with green (active/winning) or pink (prizes) at 40% opacity, large blur radius
- Gradients: Green-to-pink on special elements (prize amounts, winning states)
- Pill shapes: rounded-full for chips, badges, small buttons
- Card shapes: rounded-2xl for major panels

## Animations
**Purposeful Only:**
- Number call: Quick bounce-in (0.2s spring)
- Prize counter: Smooth increment with brief green flash
- Win state: Pulsing green glow (2s loop)
- Card purchase: Success checkmark scale-in
- Loading: Rotating Solana logo or green dot pulse

Avoid excessive particle effects or screen transitions that slow gameplay.