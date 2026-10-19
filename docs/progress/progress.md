# Vicify Progress

## Recently Completed (Oct 19, 2026)

- [x] **PR #9 review feedback sweep** — complete
  - `search.tsx`: removed all `any`/`as unknown as` casts by narrowing on the union member properties; added `isSearchType()` type guard for the search-type dropdown
  - `search.tsx`: collapsed the redundant ternary key/URI lookups (`'id' in item ? ... : ...`) that narrowed to `never`
  - `search.tsx`: single `setSearchText` call per keystroke (was two)
  - `copy-embed-code.tsx`: renamed `sanitizeForHtml` -> `validateSpotifyId` (it validates, does not escape) and switched to an `InvalidTrackIdError` class instead of message matching
  - `copy-embed-code.tsx`: no longer shows "Copied Embed Code" when `withCurrentTrack` returned null
  - `spotify.ts`: `playTrack()`/`setVolume()` now return `boolean` so callers don't report success when there is no active device
  - `volume-set.tsx`: uses the shared `setVolume()` helper instead of calling the API directly
  - `start-radio.tsx`: uses `getCurrentTrack()` instead of hand-rolling the lookup
  - `config.ts`: `chmod 0o700` on an existing config directory (the `mode` option only applies at creation)
  - `devices.tsx`: surfaces the `saveLastDeviceName` write failure instead of silently ignoring it
  - Deleted orphaned `volume-preset.tsx` (left over from #8, no longer wired to any command)

- [x] **Spotify February 2026 Web API migration** — complete
  - Playback can return a podcast **Episode**, not just a Track. Episodes have no `artists`/`album`, so `formatArtists` would have thrown. Added an `Episode` type and a `type !== 'track'` guard in `getCurrentTrack()`, plus `validateTrack()` in `current-track.tsx` and `now-playing.tsx`
  - `@spotify/web-api-ts-sdk` v1.2.0 is still the latest release and hardcodes the routes Spotify removed. Added `spotifyFetch()` for the replacements:
    - `POST /playlists/{id}/tracks` -> `POST /playlists/{id}/items`
    - `DELETE /playlists/{id}/tracks` -> `DELETE /playlists/{id}/items`
    - `GET /playlists/{id}/tracks` -> `GET /playlists/{id}/items`
    - `POST /users/{user_id}/playlists` -> `POST /me/playlists` (also drops the `GET /me` round trip)
  - Playlist field rename `tracks` -> `items`, `track` -> `item`; both shapes accepted since Extended Quota Mode apps still return the old one
  - `/search` `limit` max dropped 50 -> 10, so the search view now requests 10 explicitly
  - `popularity` (Track) and `followers` (Artist) were removed from responses; both views degrade gracefully instead of rendering `undefined`
  - Added `is_restricted` and `supports_volume` to the `Device` type

## In Progress

None currently.

## Known Gaps

- `GET /recommendations` (used by `start-radio.tsx`) is **Deprecated** with no documented successor. It still works. If it is ever removed, fall back to seeding a context URI (album/artist) via `startResumePlayback`.
- No CI. Nothing verifies the build or types on push. A workflow running `tsc --noEmit` and `vici build` would catch this class of breakage automatically.
- No tests and no linter configured.
- `spotifyFetch()` is a workaround for SDK bindings that do not exist yet. Revisit once `@spotify/web-api-ts-sdk` ships the `/items` and `/me/playlists` routes.

---

## Previously Completed (Feb 14, 2026)

- [x] **Security & Code Quality Audit Fixes** — 100% complete
  - Fixed HTML injection vulnerability in copy-embed-code.tsx by adding sanitization function
  - Added proper error handling for filesystem operations in config.ts with try-catch blocks and restrictive file permissions (0o700 for dirs, 0o600 for files)
  - Implemented input sanitization for search queries with length limits and character filtering
  - Replaced `any` types with proper TypeScript interfaces (Track, Artist, Album, Playlist) in 10+ files
  - Fixed race condition in devices.tsx by adding isMounted ref and cleanup for setTimeout
  - Enhanced input validation in volume-set.tsx with isFinite check
  - Added explicit return type annotations (`Promise<void>`) to all async command functions
  - Removed magic numbers by defining constants (DEVICE_RETRY_DELAY_MS, MAX_SEARCH_QUERY_LENGTH, MIN_SEARCH_QUERY_LENGTH)
  - Fixed unused variables in search.tsx

### Files Modified
- `src/copy-embed-code.tsx` - Added HTML sanitization
- `src/utils/config.ts` - Added error handling and secure file permissions
- `src/search.tsx` - Added input sanitization and proper types
- `src/find-lyrics.tsx` - Replaced any types with proper Track type
- `src/volume-set.tsx` - Enhanced validation and return types
- `src/devices.tsx` - Fixed race condition, added constants
- `src/copy-url.tsx` - Added proper types and return types
- `src/like.tsx` - Added proper types and return types
- `src/dislike.tsx` - Added proper types and return types
- `src/copy-artist-and-title.tsx` - Added proper types and return types
- `src/start-radio.tsx` - Added proper types and return types

---

## Upcoming

- Add CI (typecheck + build on push) — highest value item, see Known Gaps
- Consider adding ESLint configuration
- Consider adding testing infrastructure (Vitest/Jest)
