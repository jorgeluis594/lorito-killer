export function countReadyRounds(
  items: Array<{ round: number; kitchenStatus?: string }>,
): number {
  const rounds = new Map<number, boolean>();

  for (const item of items) {
    if (item.kitchenStatus === "CANCELLED") continue;
    rounds.set(
      item.round,
      (rounds.get(item.round) ?? true) && item.kitchenStatus === "READY",
    );
  }

  return [...rounds.values()].filter(Boolean).length;
}
