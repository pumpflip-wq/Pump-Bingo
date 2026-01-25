import crypto from "crypto";

export function hashToInt(seed: string, nonce: number): number {
  const h = crypto
    .createHash("sha256")
    .update(`${seed}:${nonce}`)
    .digest("hex");
  return parseInt(h.slice(0, 8), 16);
}

export function getDeterministicDraw(seed: string, drawn: number[]): number | null {
  const nonce = drawn.length;
  const available = Array.from({ length: 75 }, (_, i) => i + 1).filter(
    (n) => !drawn.includes(n),
  );
  if (!available.length) return null;
  const idx = hashToInt(seed, nonce) % available.length;
  return available[idx];
}
