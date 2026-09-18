// Thin client for the sibling factorio-broadcast project's sidecar
// (GET /api/stats). Deliberately not a new stats pipeline — factoriollm's
// job is deploy/diff/destroy, not ongoing production monitoring; that's
// already solved. See README.md.

// Verified live against the real sidecar response — items are nested by
// time window ("5s", "1m", "10m", "1h", ...; the mod's fb-windows setting
// decides which exist), not a flat items.produced the README's simplified
// example snippet suggested.
export interface StatsSnapshot {
  tick: number;
  receivedAt: number;
  surfaces: Record<
    string,
    {
      items: Record<string, { produced: Record<string, number>; consumed: Record<string, number> }>;
    }
  >;
}

export async function fetchStats(sidecarUrl: string): Promise<StatsSnapshot> {
  const res = await fetch(`${sidecarUrl}/api/stats`);
  if (!res.ok) {
    throw new Error(`factorio-broadcast ${sidecarUrl}/api/stats returned HTTP ${res.status}`);
  }
  return (await res.json()) as StatsSnapshot;
}

export interface SmokeCheckResult {
  ok: boolean;
  producedRate?: number;
  elapsedMs: number;
}

/**
 * Polls until `surface`'s per-minute production rate for `item` (in the
 * given stats window) goes above 0, or `timeoutMs` elapses. Only meaningful
 * on a save where nothing else is already producing that item — on a busy
 * base, this can't distinguish your instance's contribution from everyone
 * else's. Deploying to a dedicated `fllm-*` surface is the fix: production
 * statistics are per-surface, so nothing else can contaminate the reading.
 * See README.md, "Managed surfaces".
 */
export async function waitForProduction(
  sidecarUrl: string,
  surface: string,
  item: string,
  timeoutMs: number,
  pollIntervalMs = 1000,
  window = "5s",
): Promise<SmokeCheckResult> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const stats = await fetchStats(sidecarUrl).catch(() => null);
    const rate = stats?.surfaces?.[surface]?.items?.[window]?.produced?.[item];
    if (rate !== undefined && rate > 0) {
      return { ok: true, producedRate: rate, elapsedMs: Date.now() - start };
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return { ok: false, elapsedMs: Date.now() - start };
}
