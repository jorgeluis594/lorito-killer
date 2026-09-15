export async function createKitchenTickets<T>(
  kitchens: T[],
  create: (kitchen: T) => Promise<string | null>,
): Promise<string[]> {
  const jobIds: string[] = [];
  for (const kitchen of kitchens) {
    const jobId = await create(kitchen);
    if (jobId) jobIds.push(jobId);
  }
  return jobIds;
}
