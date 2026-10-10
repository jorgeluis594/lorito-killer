import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Las suites de tests/integration comparten una base real y toman bloqueos
    // serializables sobre las mismas tablas: en paralelo se agotan los
    // reintentos por conflictos de escritura (P2034).
    fileParallelism: false,
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "tests/**/*.{test,spec}.{ts,tsx}",
    ],
    passWithNoTests: true,
  },
});
