import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      // you can include other reporters, but 'json-summary' is required, json is recommended
      reporter: ["text", "json-summary", "json", "html", "clover"],
      include: ["src/**/*.ts"],
    },
  },
});
