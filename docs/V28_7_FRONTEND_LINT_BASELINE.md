# V28.7 Frontend lint baseline

V28.7 turns the existing legacy React lint debt into a visible warning baseline instead of suppressing lint entirely.

The CI log showed 48 errors caused by four rules that are widespread in the existing frontend:

- `react-hooks/set-state-in-effect`
- `react-hooks/immutability`
- `@typescript-eslint/no-explicit-any`
- `prefer-const`

These four rules remain enabled at warning severity. All other ESLint errors continue to fail CI. The workflow no longer uses `continue-on-error` for the lint step, so any new non-baselined lint error blocks the pipeline.

This patch intentionally does not refactor dozens of React components at once. Those warnings can be removed incrementally in later versions with focused behavior-preserving changes.
