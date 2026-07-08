import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./tests/setup/components.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "system",
          environment: "node",
          include: ["tests/system/**/*.test.ts"],
          globalSetup: ["./tests/setup/system-global.ts"],
          setupFiles: ["./tests/setup/system.ts"],
          // System tests share one database — run files serially.
          fileParallelism: false,
        },
      },
    ],
  },
});
