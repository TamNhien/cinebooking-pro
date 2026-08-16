# V26.3 Service Worker Diagnostic Fix

## Problem

`diagnose-v26.ps1` searched the downloaded `sw.js` source for the fully expanded cache name `cinebooking-shell-v26`.

The service worker intentionally builds that cache name at runtime:

```js
const VERSION = "v26";
const SHELL_CACHE = `cinebooking-shell-${VERSION}`;
```

Therefore the literal string `cinebooking-shell-v26` is not present in the JavaScript source and the diagnostic produced a false negative even though the service worker was valid.

## Fix

V26.3 validates both parts of the source contract instead:

- `VERSION` is `v26`.
- The shell cache uses `cinebooking-shell-${VERSION}`.

The smoke test uses the same checks. No database, API, booking, authentication, or service-worker runtime behavior is changed.
