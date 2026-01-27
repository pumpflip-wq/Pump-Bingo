export function generateBingoCard(): number[][] {
  const ranges = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75],
  ];
  const cols = ranges.map(([min, max]) =>
    Array.from({ length: max - min + 1 }, (_, i) => i + min)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5),
  );
  cols[2][2] = 0; // free space
  return Array.from({ length: 5 }, (_, r) => cols.map((col) => col[r]));
}

export function validateBingo(card: number[][], drawn: number[]): boolean {
  const set = new Set(drawn);
  const ok = (n: number) => n === 0 || set.has(n);

  // Rows
  for (let i = 0; i < 5; i++) {
    if (card[i].every(ok)) return true;
  }
  // Columns
  for (let i = 0; i < 5; i++) {
    if (card.map((r) => r[i]).every(ok)) return true;
  }
  // Diagonals
  if ([0, 1, 2, 3, 4].every((i) => ok(card[i][i]))) return true;
  if ([0, 1, 2, 3, 4].every((i) => ok(card[i][4 - i]))) return true;
  
  return false;
}

export function calculateWinProb(card: number[][], drawn: number[]): number {
  const drawnSet = new Set(drawn);
  drawnSet.add(0);
  if (drawn.length <= 1) return 0;

  const lines = [
    ...Array(5).fill(0).map((_, r) => card[r]),
    ...Array(5).fill(0).map((_, c) => card.map((r) => r[c])),
    Array(5).fill(0).map((_, i) => card[i][i]),
    Array(5).fill(0).map((_, i) => card[i][4 - i]),
  ];

  let maxMarked = 0,
    potentialLines = 0,
    totalMarked = 0;

  lines.forEach((line) => {
    const marked = line.filter((n) => drawnSet.has(n)).length;
    if (marked > maxMarked) maxMarked = marked;
    if (marked === 4) potentialLines++;
  });

  card.flat().forEach((num) => {
    if (num !== 0 && drawnSet.has(num)) totalMarked++;
  });

  if (maxMarked === 5) return 100;
  if (totalMarked >= 1 && drawn.length > 0) {
    const hitDensity = (totalMarked / 24) * 20; // Increased weight
    let baseLineProb = 0;
    if (maxMarked === 2) baseLineProb = 10;
    else if (maxMarked === 3) baseLineProb = 30;
    else if (maxMarked === 4) baseLineProb = 60;

    const proximityBonus = potentialLines * 15;
    const gameProgress = (drawn.length / 75) * 15;

    return Math.max(1, Math.min(99, Math.floor(baseLineProb + hitDensity + proximityBonus + gameProgress)));
  }

  return 0;
}
