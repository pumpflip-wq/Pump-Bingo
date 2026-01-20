# PUMP BINGO - Design Guidelines

## Design Approach
**Cyberpunk Trading Terminal Aesthetic** - Inspired by premium financial terminals (Bloomberg, TradingView) fused with underground crypto gaming energy. Think Binance futures interface meets cyberpunk arcade. Information-dense displays with surgical precision, neon accents piercing deep blacks, and real-time data streams. Professional enough for high-stakes wagering, edgy enough for degens.

## Color Palette
- **Primary Action:** Neon Green `#22c55e` (buy buttons, winning states, active trades)
- **Accent:** Electric Purple `#ec4899` (prizes, multipliers, special highlights)
- **Background Base:** `#09090b` (deep black foundation)
- **Surfaces:** `#0f0f14` and `#1a1a1f` (layered panels)
- **Borders:** `#27272a` with subtle green/purple glow accents
- **Text Primary:** `#fafafa`, Secondary: `#a1a1aa`, Muted: `#52525b`

## Typography
**Font Stack:**
- Headers: 'Rajdhani' (700-800 weight, uppercase tracking-wide for impact)
- Data/Numbers: 'JetBrains Mono' (600-700 for all numeric displays, addresses, timers)
- Body: System fonts (-apple-system, sans-serif) for optimal legibility

**Hierarchy:**
- Main Logo/Title: text-7xl md:text-8xl font-extrabold uppercase tracking-wider
- Section Headers: text-3xl md:text-4xl font-bold uppercase tracking-wide
- Bingo Numbers (Called): text-6xl md:text-7xl monospace font-bold
- Card Grid Numbers: text-4xl monospace font-semibold
- Prize Amounts: text-5xl md:text-6xl monospace with gradient treatment
- Stats/Data: text-lg md:text-xl monospace font-medium
- Labels: text-sm font-semibold uppercase tracking-widest

## Layout System
**12-Column Grid with Breakpoints:**
- Mobile: Single column, full-width stacked sections (p-4, gap-6)
- Tablet: 8-column grid (p-6, gap-8)
- Desktop: Full 12-column (p-8, gap-12), three-zone layout (3-col sidebar | 6-col main | 3-col sidebar)

**Spacing Units:** Tailwind 4, 6, 8, 12, 16, 24
- Section padding: py-12 md:py-16
- Card internal: p-6 md:p-8
- Component gaps: gap-4 md:gap-6
- Grid spacing: gap-3 for bingo card cells

## Component Library

**Header Navigation:**
Fixed top, backdrop-blur-xl with dark gradient (black to transparent). Left: "PUMP BINGO" logo (Rajdhani, oversized, green gradient). Center: Round timer (circular progress, green stroke), current round #, players online (monospace). Right: SOL balance (large monospace, green), wallet button (green bg, black text, rounded-lg, sharp borders).

**Main Bingo Card:**
Centered panel, 5x5 grid occupying 60% viewport width desktop. Container: rounded-xl with double border (inner green glow, outer dark). Each cell: square aspect-ratio, monospace number centered, sharp internal borders (#27272a). Called numbers: green background with instant highlight transition. FREE space: purple gradient with icon. Winning cells: animated green outline pulse (2s).

**Number Call Display:**
Horizontal banner above card. Latest number: gigantic text (text-8xl), green text-shadow glow, brief scale-in. History strip below: horizontally scrolling pills (rounded-full, border-2 green, dark bg, monospace numbers).

**Prize Pool Panel:**
Prominent card with gradient border (green-to-purple). Top: Total pool (huge monospace SOL amount, animated counter with sparkle effect on increment). Below: 3-column grid of prize tiers (2-col mobile). Each tier card: pattern type icon, SOL amount (purple gradient text), win condition, odds (small muted text).

**Transaction Feed (Sidebar):**
Vertical scrolling panel. Each entry: compact card with timestamp, event type badge (pill-shaped, color-coded), truncated wallet, action description. Recent wins highlighted with purple border glow.

**Buy Card CTA:**
Full-width bottom bar mobile, prominent centered button desktop. Neon green background, black text, Rajdhani font, rounded-lg, thick border with shadow-2xl green glow. Text: "BUY CARD - 0.1 SOL" plus card count available.

**Stats Dashboard (Second Sidebar):**
Stacked information cards: Leaderboard (top 5, rank badges with gradient, monospace addresses, win counts), Your Stats (games played, win rate, total won), Recent Activity. Each card: glassmorphic background, refined borders.

**Footer:**
Compact terminal-style bar. Left: Solana logo + "POWERED BY SOLANA". Center: Contract address (monospace, click-to-copy with green flash). Right: Social icons (Discord, X, Telegram) with subtle hover glow.

## Images

**Hero Background:**
Full-viewport cyberpunk cityscape with neon grid overlay. Abstract purple and green light trails cutting through dark geometric architecture. Tron-meets-Blade Runner aesthetic with heavy film grain texture. Dark gradient overlay (90% black at bottom fading to 60% at top) ensures text readability. Position "ENTER GAME" and "CONNECT WALLET" buttons centered with backdrop-blur-lg cards behind them (no hover states on these backdrop buttons).

**Texture Overlays:**
Scanline effect at 2% opacity across all dark surfaces. Subtle dot matrix pattern in corners and edges for depth.

## Visual Treatment
- **Glassmorphism:** All panels use backdrop-blur-lg with rgba backgrounds (0.05-0.1 alpha)
- **Borders:** 1-2px sharp borders, green or purple on interactive elements
- **Glows:** box-shadow with 20px blur, green/purple at 30% opacity on hover/active states
- **Gradients:** Green-to-purple on prize amounts, winning states, special badges
- **Shapes:** rounded-lg for major containers, rounded-full for pills/badges, sharp corners for grid cells

## Animations (Minimal)
- Number call: Quick scale-in (0.15s cubic-bezier)
- Prize increment: Smooth count-up with brief green flash
- Win pattern: Pulsing green glow (2s loop)
- Button interactions: Standard scale and glow (handled by Button component)
- Loading states: Rotating Solana icon or green pulse dot