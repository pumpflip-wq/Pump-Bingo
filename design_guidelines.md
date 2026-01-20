# Cyberpunk Bingo Game - Design Guidelines

## Design Approach
**Reference-Based Cyberpunk Gaming UI** inspired by high-end crypto platforms (Phantom, Magic Eden) combined with modern gaming interfaces (Valorant, Cyberpunk 2077 UI). Focus on readability over excessive glitch effects—professional cyberpunk, not chaotic.

## Typography
**Font Stack:**
- Primary: 'Rajdhani' (700 for headings, 600 for subheadings, 500 for UI elements) - geometric, tech-forward
- Secondary: 'Inter' (400-600) for body text, game instructions, and data displays
- Monospace: 'JetBrains Mono' for wallet addresses, transaction IDs, numbers

**Hierarchy:**
- Game Title/Headers: text-5xl to text-7xl, font-bold, uppercase, letter-spacing wider
- Section Headers: text-3xl to text-4xl, font-semibold, uppercase
- Card Numbers: text-4xl to text-6xl, font-bold (highly readable)
- Body/Instructions: text-base to text-lg, leading-relaxed
- Small Data (odds, multipliers): text-sm, font-medium, monospace

## Layout System
**Spacing Primitives:** Use Tailwind units of 3, 4, 6, 8, 12, 16, 24 for consistent rhythm
- Component padding: p-6 to p-8
- Section gaps: gap-8 to gap-12
- Card spacing: space-y-6
- Grid gaps: gap-4 to gap-6

**Container Strategy:**
- Main game area: max-w-7xl mx-auto with asymmetric sidebars
- Bingo cards: Centered, prominent, 60% viewport width on desktop
- Sidebar panels: 20% each side for stats/prizes/history

## Component Library

**Navigation/Header:**
Top bar with wallet connection (Phantom logo visible), SOL balance display, username, neon green connect button with backdrop-blur background

**Bingo Card:**
5x5 grid with deep purple background (darker than base), each cell has:
- Sharp borders with neon green accent on called numbers
- Gradient overlay on selected cells (green glow effect)
- Large monospace numbers, center-aligned
- "FREE" space with subtle icon/pattern
- Hover state: subtle green border pulse

**Prize Pool Display:**
Large glowing container showing:
- Total prize in SOL (huge text, animated counter)
- Multiplier badges with gradient backgrounds
- Prize tier breakdown (cards, 3-column grid on desktop, stack mobile)
- Each tier: icon, label, SOL amount, neon dividers

**Game Status Panel:**
Prominent top section displaying:
- Round number, timer (circular progress indicator with neon ring)
- Called numbers (horizontal scrolling chips with green glow)
- Next draw countdown

**Action Buttons:**
- Primary CTA ("BUY CARD", "CLAIM PRIZE"): Large, neon green with dark text, strong box-shadow glow
- Secondary actions: Outlined neon green, transparent bg with backdrop-blur
- Disabled state: opacity-40 with muted purple

**Transaction History:**
Sidebar component with:
- Recent calls list (compact, scrollable)
- Win notifications (slide-in animations)
- Transaction status indicators (pending/confirmed with animated dots)

**Leaderboard Section:**
Cards showing top players:
- Rank badge (gradient, geometric shape)
- Player avatar placeholder (geometric patterns)
- Win count and SOL earned
- 2-column grid desktop, single mobile

**Footer:**
Minimal footer with Solana logo, game rules link, smart contract address (monospace, truncated with copy button), social links with neon icon treatment

## Visual Treatment Notes
- All panels: backdrop-blur-lg with semi-transparent dark purple backgrounds
- Borders: 1-2px neon green accent lines, used sparingly
- Shadows: Large glowing box-shadows on interactive elements (green glow)
- Dividers: Horizontal lines with gradient fade (green to transparent)
- Glass-morphism on overlay modals (game rules, transaction confirmations)

## Images
**Hero/Welcome Screen (if lobby exists):**
Abstract geometric cityscape with neon grid lines, purple and green color scheme. Positioned as full-viewport background with dark gradient overlay to ensure text readability. Main CTA buttons use backdrop-blur backgrounds as specified.

**Background Patterns:**
Subtle grid pattern or circuit board texture at 5% opacity across dark purple base for depth without distraction.

**No decorative images needed** for active game interface—focus on data clarity and UI elements.

## Animations
**Minimal, purposeful only:**
- Number reveal: Quick scale-in when called (0.3s)
- Prize counter: Smooth number increment
- Win state: Subtle green glow pulse on winning card
- Loading states: Rotating Solana logo or dot pulse

Avoid: Screen glitches, excessive particle effects, complex transitions that distract from gameplay.