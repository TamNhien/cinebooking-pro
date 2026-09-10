import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // V72 lint-clean gate: keep these compatibility rules visible as warnings so
    // intentional legacy exceptions must be scoped and documented. `npm run lint`
    // uses --max-warnings=0, so every unsuppressed warning fails the gate.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
      // CineBooking intentionally uses full-document navigation at auth/session
      // boundaries so in-memory credentials and session-derived state are reset.
      // Normal in-app navigation still uses next/link. Keep this compatibility
      // policy explicit instead of carrying dozens of per-call suppressions.
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**"]),
]);
