# V29.1 - GitHub Actions checkout v7 compatibility

V29.1 fixes a source-regression false negative after Dependabot upgrades `actions/checkout` from v6 to v7.

The V28 verifier previously required the literal `actions/checkout@v6`. V29.1 accepts the supported v6 or v7 majors, while the V29.1 baseline workflows use v7. This keeps the safety check enabled without forcing a downgrade.

No application runtime, database schema, production secret, or deployment behavior changes in this patch.
