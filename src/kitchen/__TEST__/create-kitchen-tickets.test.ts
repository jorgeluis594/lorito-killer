import { expect, test, vi } from "vitest";
import { createKitchenTickets } from "../use-cases/create-kitchen-tickets";

test("creates every ticket and returns only configured print jobs", async () => {
  const create = vi
    .fn<(kitchen: string) => Promise<string | null>>()
    .mockResolvedValueOnce("job-1")
    .mockResolvedValueOnce(null);

  expect(
    await createKitchenTickets(["kitchen-1", "kitchen-2"], create),
  ).toEqual(["job-1"]);
  expect(create).toHaveBeenCalledTimes(2);
});
