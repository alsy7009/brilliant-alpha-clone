/**
 * Helpers for tile-bank widgets where the bank can contain duplicate VALUES
 * (e.g. two "2" tiles). Each tile gets a unique instance id so duplicates don't
 * share React keys or selection/used state, while slots still store plain values
 * (which is what the validators compare against).
 */

export interface BankTile {
  /** Unique per bank position. */
  id: string
  /** The display/answer value (what gets placed into a slot). */
  value: string
}

export function buildBankTiles(tileBank: string[]): BankTile[] {
  return tileBank.map((value, index) => ({ id: `${index}-${value}`, value }))
}

/**
 * Per-bank-position "used" flags. Among tiles sharing a value, the first
 * `slotCount(value)` instances are marked used so exactly the right number of
 * duplicates disable as they're consumed.
 */
export function usedFlags(
  tileBank: string[],
  slots: Record<string, string | null>,
): boolean[] {
  const slotCount: Record<string, number> = {}
  for (const v of Object.values(slots)) {
    if (v) slotCount[v] = (slotCount[v] ?? 0) + 1
  }
  const seen: Record<string, number> = {}
  return tileBank.map((v) => {
    const rank = seen[v] ?? 0
    seen[v] = rank + 1
    return rank < (slotCount[v] ?? 0)
  })
}

/**
 * Place `value` into `slotId`. Duplicates are allowed up to the bank's supply of
 * that value; if placing would exceed supply, the oldest other slot holding the
 * same value is freed (so a single tile still "moves" rather than duplicating).
 */
export function placeValue(
  slots: Record<string, string | null>,
  slotId: string,
  value: string,
  tileBank: string[],
): Record<string, string | null> {
  const next: Record<string, string | null> = { ...slots, [slotId]: value }
  const supply = tileBank.filter((t) => t === value).length
  const holders = Object.keys(next).filter((k) => next[k] === value)
  let excess = holders.length - supply
  for (const k of holders) {
    if (excess <= 0) break
    if (k === slotId) continue
    next[k] = null
    excess -= 1
  }
  return next
}
