# CLAUDE.md

## Project

Violentmonkey userscript for ASSD (AO Hostels booking system). Autofills new booking forms and injects utility buttons into the reservierungen workflow.

## Environment

- Browser userscript (Violentmonkey)
- No build step — edit `assd-autofill.user.js` directly
- Matches `https://*.assd.com/*` and `https://*.assd.com:9443/*`

## Development

No build, test, or lint commands. Load the script in Violentmonkey for manual testing on the live ASSD system.

Always bump `@version` in the userscript header before committing. Violentmonkey uses this to offer update prompts via `@updateURL`.

## Conventions

- Consult `../assd-codex/CLAUDE.md` for ASSD DOM patterns, boilerplate, and UI style conventions before making changes.
- All console messages are prefixed `[assd-autofill]`.
- `const USER` at the top of the IIFE is the per-user identifier (e.g. `WEGENSTEI3`) — used in memo timestamp entries.
- Memo buttons are injected via MutationObserver into `.ui-dialog` elements containing `#memo`. Each button gets class `assd-memo-injected` to prevent duplicate injection.
- Date autofill checks both the visible text input (`input[id^="arrival_ds"]`) and the hidden value input (`input[id^="arrival_dp"]`) before touching the datepicker — the hidden field is pre-filled when opening a booking from reservierungen.

## Features

| Feature | Trigger | Notes |
|---|---|---|
| Booking autofill | `#cmdguest3` button click | Fills arrival (today), departure (tomorrow), guests, user, regcode |
| Customer mask autofill | Dialog with `.guestName` appears | Fills nation, guestcode, matchcode; picks 3rd autocomplete result |
| Memo timestamp (T) | Manual button click | Prepends `DD.MM.YY -  - USER`, cursor between dashes |
| Memo parking (P) | Manual button click | Inserts "Parking added as per sender" at cursor |
