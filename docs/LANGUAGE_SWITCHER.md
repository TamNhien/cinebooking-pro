# VN / EN Language Switcher

The header now contains a compact VN / EN segmented language control matching the supplied reference style:

- VN is red when Vietnamese is active.
- EN is grey when inactive; clicking it makes EN red and VN grey.
- A white strip with red dots is displayed underneath.
- The choice is saved in `localStorage` under `cinebooking_language`.
- `document.documentElement.lang` changes between `vi` and `en`.
- Header, homepage, quick booking flow, and footer are bilingual.

No database migration is required.
