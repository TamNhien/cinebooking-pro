# V30.2 - Playwright pin-policy compatibility

V30.2 fixes a false-negative in the V29.2 source verifier. The old check accepted only the literal `@playwright/test` version `1.60.0`; therefore a valid exact patch update could fail the source gate even though the dependency remained pinned.

The new policy requires an exact `1.60.x` version, allows only patch updates automatically, and asks Dependabot to hold Playwright minor/major upgrades for explicit compatibility review. No application, database, Flyway, booking, payment, or deployment behavior changes.
