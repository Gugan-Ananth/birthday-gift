export function stillWaiting(openOn: string | null, now = new Date()) {
  if (process.env.GIFT_PREVIEW === "1") return false;
  if (!openOn) return false;
  return now.toISOString().slice(0, 10) < openOn;
}
