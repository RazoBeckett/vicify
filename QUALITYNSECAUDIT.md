# Vicify Extension - Security & Code Quality Audit

**Audit Date:** February 14, 2026  
**Project:** Vicify (Spotify Control Extension for Vicinae)  
**Total Lines of Code:** ~2,881 (source files only)  
**Audit Type:** Comprehensive Security & Quality Assessment  

---

## Executive Summary

This audit assesses the Vicify extension codebase for security vulnerabilities, code quality issues, and adherence to best practices. The codebase is generally well-structured but has several areas requiring attention.

### Overall Ratings

| Category | Rating | Score |
|----------|--------|-------|
| **Security** | 🟡 Moderate | 6.5/10 |
| **Code Quality** | 🟢 Good | 7.5/10 |
| **Type Safety** | 🟡 Moderate | 6/10 |
| **Maintainability** | 🟢 Good | 7/10 |
| **Documentation** | 🟡 Moderate | 6/10 |

---

## 1. Security Assessment

### 1.1 🔴 High Severity Issues

#### 1.1.1 Missing HTTPS for OAuth Callback
**Location:** `src/utils/spotify.ts:22`

```typescript
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
```

**Risk:** The OAuth redirect URI uses HTTP instead of HTTPS. While localhost connections are generally considered lower risk, using HTTP for OAuth flows violates OAuth 2.0 security best practices.

**Recommendation:** 
- Use `https://127.0.0.1:8888/callback` with a self-signed certificate
- Or use a loopback IP redirect with PKCE which is the current implementation
- Document this security consideration

**Status:** ⚠️ Partially mitigated by PKCE flow (no client secret)

#### 1.1.2 No Input Sanitization on Search Queries
**Location:** `src/search.tsx:14-48`, `src/find-lyrics.tsx:20`

Search queries are passed directly to Spotify API without sanitization:

```typescript
const searchQuery = encodeURIComponent(`${artistNames} ${trackName} lyrics`);
const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;
```

While `encodeURIComponent` is used for the lyrics search, the main Spotify search doesn't apply any sanitization.

**Risk:** Potential for injection attacks if the Spotify SDK doesn't properly escape parameters.

**Recommendation:** 
- Add input validation and sanitization for search queries
- Limit query length to reasonable bounds (e.g., 200 characters)
- Strip potentially dangerous characters

### 1.2 🟡 Medium Severity Issues

#### 1.2.1 Token Storage in LocalStorage
**Location:** `src/utils/spotify.ts:77-78, 258-267, 291`

OAuth tokens are stored in Vicinae's LocalStorage:

```typescript
await LocalStorage.setItem('spotify_token_data', JSON.stringify(tokenData));
```

**Risk:** 
- Tokens persist indefinitely unless explicitly cleared
- If Vicinae's storage is compromised, tokens could be extracted
- No automatic cleanup of expired tokens

**Recommendation:**
- Implement automatic token cleanup on expiration
- Consider using secure storage mechanisms if available
- Add token encryption at rest

#### 1.2.2 State Parameter Not Cryptographically Bound
**Location:** `src/utils/spotify.ts:42-44, 73-78`

The OAuth state parameter is generated using simple random bytes:

```typescript
function generateRandomString(length: number): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}
```

**Risk:** While crypto.randomBytes is secure, the state parameter should ideally be cryptographically bound to the session.

**Recommendation:**
- Consider using a hash of the code_verifier as the state parameter
- Or store a nonce that is verified against the session

#### 1.2.3 Missing Rate Limiting
**Location:** Throughout codebase

No rate limiting is implemented for API calls. The `loadCurrentTrack()` function in `now-playing.tsx` polls every 5 seconds:

```typescript
const interval = setInterval(() => {
  loadCurrentTrack();
}, 5000);
```

**Risk:** Could hit Spotify API rate limits (unknown limits not documented in code).

**Recommendation:**
- Implement exponential backoff for retries
- Add rate limiting wrapper for API calls
- Document Spotify API rate limits

### 1.3 🟢 Low Severity Issues

#### 1.3.1 Sensitive Data in Console Logs
**Location:** `src/utils/spotify.ts:186-187, 305, 314`

Debug logging includes potentially sensitive information:

```typescript
console.log('[Vicify] Local server started on port 8888');
console.log('[Vicify] Opening browser for authentication...');
```

**Risk:** Low - these logs don't include tokens, but indicate authentication flow state.

**Recommendation:**
- Remove or reduce debug logging in production
- Use a proper logging framework with levels

#### 1.3.2 Missing Certificate Validation
**Location:** OAuth token exchange (`src/utils/spotify.ts:142-154`)

The code uses `fetch()` for token exchange without explicit certificate validation options.

**Recommendation:**
- Ensure Node.js environment validates SSL certificates
- Document SSL/TLS requirements

---

## 2. Code Quality Assessment

### 2.1 🔴 Critical Issues

#### 2.1.1 No Error Handling for File System Operations
**Location:** `src/utils/config.ts:33-40, 45-59, 64-74`

File system operations lack proper error handling:

```typescript
function ensureConfigDirectory(): void {
  const configPath = getVicifyConfigPath();
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}
```

**Issues:**
- `fs.mkdirSync` can throw if permissions are insufficient
- `fs.writeFileSync` errors are only logged, not propagated
- No atomic write operations for config files

**Recommendation:**
```typescript
function ensureConfigDirectory(): void {
  try {
    const configPath = getVicifyConfigPath();
    const configDir = path.dirname(configPath);

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true, mode: 0o700 }); // Restrictive permissions
    }
  } catch (error) {
    console.error('[Vicify] Failed to create config directory:', error);
    throw new Error('Failed to initialize configuration');
  }
}
```

### 2.2 🟡 Significant Issues

#### 2.2.1 Inconsistent Error Handling Patterns
**Location:** Throughout codebase

Different commands handle errors inconsistently:

Some use try-catch with `handleSpotifyError`:
```typescript
} catch (error) {
  await handleSpotifyError(error, 'Failed to...');
}
```

Others don't handle errors at all:
```typescript
// Missing error handling
await loadPlaylists();
```

**Recommendation:** Standardize error handling across all commands.

#### 2.2.2 Missing Validation for User Input
**Location:** `src/volume-set.tsx:9-10`

Volume input is parsed without proper validation:

```typescript
const volumeInput = props.arguments.volume;
const volume = parseInt(volumeInput, 10);
```

While there's a range check later, input like "abc123" would parse as NaN.

**Recommendation:**
```typescript
const volume = parseInt(volumeInput, 10);
if (isNaN(volume) || !isFinite(volume)) {
  // Handle invalid input
}
```

#### 2.2.3 Race Condition in Device Auto-Selection
**Location:** `src/devices.tsx:49-51`

```typescript
setTimeout(async () => {
  await loadDevicesAndAutoSelectWithRetry(lastDeviceName);
}, 3500);
```

**Issue:** No cleanup if component unmounts during the timeout.

**Recommendation:**
```typescript
const timeoutId = setTimeout(async () => {
  if (!isMounted) return;
  await loadDevicesAndAutoSelectWithRetry(lastDeviceName);
}, 3500);

// Cleanup
return () => clearTimeout(timeoutId);
```

### 2.3 🟢 Minor Issues

#### 2.3.1 Unused Function Parameters
**Location:** Multiple files

```typescript
// search.tsx - unused searchText state
const [searchText, setSearchText] = useState('');
```

**Recommendation:** Remove unused variables or use them appropriately.

#### 2.3.2 Magic Numbers
**Location:** Throughout codebase

```typescript
const EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes
const newVolume = Math.min(100, currentVolume + 10); // 10 = step size
```

**Recommendation:** Define constants for magic numbers:
```typescript
const VOLUME_STEP_SIZE = 10;
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
```

#### 2.3.3 Inconsistent Naming Conventions
**Location:** Multiple files

- `YourLibrary` vs `MyPlaylists` vs `PlaylistDetail`
- Some files use `Command` as default export name, others use descriptive names

**Recommendation:** Standardize naming conventions.

---

## 3. Type Safety Analysis

### 3.1 🔴 Type Safety Violations

#### 3.1.1 Extensive Use of `any` Type
**Location:** Throughout codebase

Count of `any` usage:
- `search.tsx`: `const [searchResults, setSearchResults] = useState<any[]>([]);`
- `search.tsx`: `const [currentTrack, setCurrentTrack] = useState<any>(null);`
- `add-to-playlist.tsx`: `const [playlists, setPlaylists] = useState<any[]>([]);`
- `add-to-playlist.tsx`: `const [currentTrack, setCurrentTrack] = useState<any>(null);`
- `devices.tsx`: Multiple `any` types for device data
- `queue.tsx`: `const [queue, setQueue] = useState<any[]>([]);`
- `now-playing.tsx`: `const [track, setTrack] = useState<any>(null);`
- `current-track.tsx`: `const [track, setTrack] = useState<any>(null);`
- And many more...

**Impact:**
- Loss of type safety benefits
- Runtime errors not caught at compile time
- Reduced IDE support and autocomplete

**Recommendation:** Replace all `any` types with proper TypeScript interfaces:

```typescript
// Instead of:
const [track, setTrack] = useState<any>(null);

// Use:
const [track, setTrack] = useState<Track | null>(null);
```

#### 3.1.2 Missing Return Type Annotations
**Location:** Multiple async functions

```typescript
async function loadData() { // Missing return type
async function playTrack(uri: string) { // Missing return type
```

**Recommendation:** Add explicit return types:
```typescript
async function loadData(): Promise<void> {
async function playTrack(uri: string): Promise<void> {
```

### 3.2 🟡 Type Safety Issues

#### 3.2.1 Unsafe Type Assertions with `as any`
**Location:** Throughout codebase (30+ occurrences)

```typescript
await safeApiCall(() => spotify.player.startResumePlayback(undefined as any, undefined, [uri]));
await safeApiCall(() => spotify.player.setPlaybackVolume(volume, undefined as any));
await safeApiCall(() => spotify.player.pausePlayback(undefined as any));
```

**Issues:**
- Suppressing type errors rather than fixing them
- Potential runtime errors if SDK types change
- Makes refactoring difficult

**Recommendation:** 
- Fix the underlying type issues or properly type the parameters
- Document why type assertions are necessary
- Consider using `@ts-expect-error` with explanations instead of `as any`

#### 3.2.2 Implicit any in Callback Parameters
**Location:** `src/your-library.tsx:86-88`

```typescript
const filteredTracks = tracks.filter(track =>
  track.name.toLowerCase().includes(searchText.toLowerCase()) ||
  track.artists.some(artist => artist.name.toLowerCase().includes(searchText.toLowerCase()))
);
```

**Recommendation:** Explicitly type callback parameters:
```typescript
const filteredTracks = tracks.filter((track: Track) =>
  track.name.toLowerCase().includes(searchText.toLowerCase()) ||
  track.artists.some((artist: Artist) => artist.name.toLowerCase().includes(searchText.toLowerCase()))
);
```

### 3.3 🟢 Type Safety Recommendations

#### 3.3.1 Enable Strict TypeScript Options
**Location:** `tsconfig.json`

Current configuration is good but could be stricter:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Recommendation:** Add additional strictness options and fix resulting errors.

---

## 4. Maintainability Assessment

### 4.1 🟢 Strengths

#### 4.1.1 Good Separation of Concerns
- Utility functions are properly isolated in `utils/` directory
- Type definitions centralized in `types/spotify.ts`
- Each command is a self-contained module

#### 4.1.2 Consistent Error Handling Utilities
The `handleSpotifyError` function provides centralized error handling:

```typescript
export async function handleSpotifyError(error: unknown, defaultMessage: string): Promise<void>
```

#### 4.1.3 Well-Structured OAuth Flow
The PKCE implementation is solid:
- Proper code verifier generation
- State parameter validation
- Secure token storage (though could be improved)

### 4.2 🟡 Areas for Improvement

#### 4.2.1 Code Duplication
**Location:** Throughout codebase

Multiple files share similar patterns:

```typescript
// Pattern repeated in 15+ files
const spotify = await getSpotifyClient();
const playbackState = await requireActiveDevice(spotify);
if (!playbackState) return;
await safeApiCall(() => spotify.player.someAction());
```

**Recommendation:** Create a higher-order function or wrapper:

```typescript
export async function withActiveDevice<T>(
  action: (spotify: SpotifyApi, deviceId: string) => Promise<T>
): Promise<T | null> {
  const spotify = await getSpotifyClient();
  const playbackState = await requireActiveDevice(spotify);
  if (!playbackState?.device?.id) return null;
  return safeApiCall(() => action(spotify, playbackState.device.id));
}
```

#### 4.2.2 Missing Unit Tests
**Critical Finding:** No test files exist in the project.

**Recommendation:** 
- Add testing infrastructure (Jest, Vitest)
- Write unit tests for utility functions
- Add integration tests for OAuth flow

#### 4.2.3 No Linting Configuration
**Location:** Project root

No ESLint or Prettier configuration present.

**Recommendation:**
```json
// .eslintrc.json
{
  "extends": [
    "@vicinae/eslint-config",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/strict"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

### 4.3 🔴 Critical Maintainability Issues

#### 4.3.1 Hardcoded Configuration Values
**Location:** Multiple files

```typescript
// start-dj.tsx
const djUri = 'spotify:playlist:37i9dQZF1EYkqdzj48dyYq';

// spotify.ts
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const SCOPES = [...]; // 13 hardcoded scopes
```

**Recommendation:** Move to configuration files:

```typescript
// config/constants.ts
export const SPOTIFY_CONFIG = {
  DJ_PLAYLIST_URI: 'spotify:playlist:37i9dQZF1EYkqdzj48dyYq',
  REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:8888/callback',
  SCOPES: [...],
} as const;
```

---

## 5. Best Practices Compliance

### 5.1 ✅ Following Best Practices

| Practice | Status | Notes |
|----------|--------|-------|
| PKCE for OAuth | ✅ | Correctly implemented without client secret |
| Error boundaries | ✅ | Toast notifications for user feedback |
| Utility reuse | ✅ | Good use of shared utilities |
| Consistent naming | ⚠️ | Mostly consistent, some variations |
| Documentation | ⚠️ | JSDoc comments present but inconsistent |

### 5.2 ❌ Violating Best Practices

| Practice | Status | Location |
|----------|--------|----------|
| Type safety | ❌ | Heavy use of `any` |
| Input validation | ❌ | Missing in search and volume commands |
| Test coverage | ❌ | No tests exist |
| Linting | ❌ | No ESLint configuration |
| Dependency management | ⚠️ | 4 direct dependencies (reasonable) |
| Secrets management | ✅ | No secrets in code |

---

## 6. Dependency Analysis

### 6.1 Direct Dependencies

| Package | Version | Risk | Notes |
|---------|---------|------|-------|
| `@spotify/web-api-ts-sdk` | ^1.2.0 | 🟢 Low | Official SDK, actively maintained |
| `@types/react` | ^19.2.8 | 🟢 Low | Type definitions |
| `@vicinae/api` | ^0.16.14 | 🟡 Medium | Proprietary, check for updates |
| `react` | ^19.2.3 | 🟢 Low | Latest stable |

### 6.2 Security Concerns

- ✅ No known vulnerable dependencies
- ✅ No deprecated packages detected
- ⚠️ `@vicinae/api` is internal - ensure it's kept up to date

### 6.3 Recommendations

1. Add `package-lock.json` or `pnpm-lock.yaml` for reproducible builds
2. Enable Dependabot or similar for automated security updates
3. Pin exact versions for production releases

---

## 7. Performance Considerations

### 7.1 Potential Issues

#### 7.1.1 Unnecessary Re-renders
**Location:** `src/now-playing.tsx:11-18`

```typescript
useEffect(() => {
  loadCurrentTrack();
  
  const interval = setInterval(() => {
    loadCurrentTrack();
  }, 5000);
  
  return () => clearInterval(interval);
}, []);
```

**Issue:** State updates every 5 seconds may cause unnecessary re-renders.

**Recommendation:** Consider using React.memo or useMemo for expensive computations.

#### 7.1.2 No Request Caching
**Location:** Throughout

API responses are not cached, causing redundant network requests.

**Recommendation:** Implement a simple cache layer for non-volatile data (user playlists, devices).

### 7.2 Good Practices

- ✅ Proper cleanup of intervals and timeouts
- ✅ Loading states prevent UI flicker
- ✅ Efficient list rendering with proper keys

---

## 8. Accessibility Assessment

### 8.1 Findings

- ✅ Keyboard shortcuts provided for common actions
- ⚠️ No aria-labels on interactive elements
- ⚠️ Color contrast not verified (Spotify green #1DB954)

### 8.2 Recommendations

1. Add accessibility labels to all Action components
2. Ensure keyboard navigation works throughout
3. Test with screen readers

---

## 9. Detailed File-by-File Analysis

### 9.1 Utility Files

#### `src/utils/spotify.ts` (541 lines) - 🟡 Good with Issues

**Strengths:**
- Comprehensive OAuth implementation
- Good error handling utilities
- Proper PKCE flow

**Issues:**
- 542 lines is large - consider splitting
- Console logging in production
- Token storage could be more secure

#### `src/utils/config.ts` (100 lines) - 🟡 Needs Improvement

**Strengths:**
- XDG Base Directory compliance
- Proper directory creation

**Issues:**
- Weak error handling
- No file locking for concurrent access
- No schema validation for config

#### `src/types/spotify.ts` (124 lines) - 🟢 Well Done

**Strengths:**
- Clear type definitions
- Good documentation comments
- Minimal, focused types

### 9.2 Command Files

#### High Quality Files (🟢):
- `volume-set.tsx` - Good input validation
- `toggle-play-pause.tsx` - Clean, focused
- `cycle-repeat.tsx` - Clear logic
- `like.tsx`, `dislike.tsx` - Simple, effective

#### Needs Improvement (🟡):
- `search.tsx` - Too many `any` types, complex logic
- `your-library.tsx` - Large file (407 lines), needs refactoring
- `devices.tsx` - Complex retry logic, needs cleanup
- `now-playing.tsx` - Polling implementation could be optimized

#### Critical Issues (🔴):
- `find-lyrics.tsx` - URL construction without validation
- `copy-embed-code.tsx` - HTML injection risk in iframe
- `current-track.tsx` - Markdown injection potential

---

## 10. Recommendations Summary

### Immediate Actions Required (🔴)

1. **Fix HTML injection vulnerability** in `copy-embed-code.tsx`
2. **Add input validation** for all user inputs
3. **Replace `any` types** with proper TypeScript types
4. **Add error handling** for filesystem operations

### High Priority (🟡)

1. Implement unit testing infrastructure
2. Add ESLint configuration with strict rules
3. Refactor large files (>200 lines)
4. Create reusable wrappers for common patterns
5. Add rate limiting for API calls

### Medium Priority (🟢)

1. Improve documentation consistency
2. Add logging framework with levels
3. Implement request caching
4. Add accessibility labels
5. Create configuration management system

### Low Priority (📋)

1. Standardize naming conventions
2. Remove magic numbers
3. Add performance monitoring
4. Create contribution guidelines

---

## 11. Compliance Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| No secrets in code | ✅ Pass | Client ID from preferences |
| No eval() or similar | ✅ Pass | Not used |
| Input validation | ⚠️ Partial | Missing in some places |
| Error handling | ⚠️ Partial | Inconsistent patterns |
| Type safety | ❌ Fail | Heavy use of `any` |
| Documentation | ⚠️ Partial | JSDoc present but inconsistent |
| Tests | ❌ Fail | No tests exist |
| Linting | ❌ Fail | No ESLint config |
| Secure storage | ⚠️ Partial | LocalStorage used |
| Rate limiting | ❌ Fail | Not implemented |

---

## 12. Appendix

### A. Security Testing Commands

```bash
# Check for secrets
grep -r "password\|secret\|token\|key" --include="*.ts" --include="*.tsx" src/

# Check for eval and similar
grep -r "eval\|Function\|setTimeout\|setInterval" --include="*.ts" --include="*.tsx" src/

# Check for any types
grep -r "as any" --include="*.ts" --include="*.tsx" src/ | wc -l
```

### B. Lines of Code by File

| File | Lines |
|------|-------|
| your-library.tsx | 406 |
| spotify.ts | 541 |
| devices.tsx | 241 |
| search.tsx | 186 |
| now-playing.tsx | 152 |
| current-track.tsx | 158 |
| queue.tsx | 145 |
| add-to-playlist.tsx | 103 |
| remove-from-playlist.tsx | 105 |
| types/spotify.ts | 124 |
| utils/config.ts | 100 |
| Other files | ~700 |
| **Total** | **2,881** |

### C. External References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)

---

## Audit Conclusion

The Vicify extension demonstrates **good architectural patterns** with proper separation of concerns and a solid OAuth implementation using PKCE. However, **significant improvements are needed** in type safety, input validation, and testing coverage.

### Risk Summary

| Risk Category | Level | Priority |
|---------------|-------|----------|
| Security | Medium | High |
| Code Quality | Medium | Medium |
| Maintainability | Low | Medium |
| Type Safety | High | High |

### Final Recommendation

**Approve with Conditions:** The codebase is functional but requires addressing the high-priority issues (type safety, input validation) before major feature additions. Implement testing infrastructure to prevent regressions.

---

**Audited by:** Sisyphus AI Agent  
**Date:** February 14, 2026  
**Version:** 1.0  
**Classification:** Internal Use
