# AGENTS.md - Vicinae Extension Development Guide

This guide helps AI agents work effectively in the Vicify (Spotify extension) codebase.

## Build & Development

### Commands
- `npm install` - Install dependencies (uses pnpm)
- `npm run dev` - Run in development mode with hot reload
- `npm run build` - Build production bundle

### Git Workflow

#### Branch Naming Convention
Use the following pattern for feature branches:
```
feat/<sensible-feature-name-spaces-must-be-replaced-with-dash-and-max-length-of-feat-name-3-5-word>
```

Examples:
- `feat/pkce-auth`
- `feat/add-playlist-support`
- `feat/improve-error-handling`

Rules:
- Prefix with `feat/` for feature branches
- Use lowercase and hyphens only
- Keep the feature name 3-5 words
- Make it descriptive and clear

### Testing
No tests currently exist in this codebase. Add testing infrastructure before writing tests.

#### Pull Request Creation
Use the GitHub CLI (`gh`) to create PRs:
```bash
gh pr create --title "feat: brief description" --body "..."
```

**PR Title Format (Conventional Commits):**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `style:` - Code style changes (formatting, etc.)
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**PR Description:**
- Keep it concise and focused on what changed and why
- Include breaking changes if any
- Reference related issues if applicable

Example:
```bash
gh pr create --title "feat: add PKCE authentication support" \
  --body "$(cat <<'EOF'
Implements PKCE (Proof Key for Code Exchange) authentication for Spotify OAuth.

**Changes:**
- Remove clientSecret requirement from preferences
- Use PKCE code_verifier for secure token exchange
- Update token refresh to work without client secret

**Breaking Changes:**
- Users need to re-authenticate after update (old tokens will be invalidated)
EOF
)"
```

## Project Structure

- **src/** - All source code
  - **utils/spotify.ts** - Shared Spotify API utilities (authentication, error handling, formatting)
  - **Command files** - Each file (e.g., `toggle-play-pause.tsx`) is a Vicinae command, one per file

## Code Style Guidelines

### File Naming
- Use kebab-case for command files: `toggle-play-pause.tsx`, `volume-down.tsx`
- Use PascalCase for components: `CurrentlyPlaying`, `Devices`

### Imports
```typescript
// 1. External libraries first
import { showToast, Toast } from '@vicinae/api';
import { useState } from 'react';

// 2. Local utilities second
import { getSpotifyClient, handleSpotifyError, formatArtists } from './utils/spotify';
```

### Component Structure
- Default export for command components
- Use named exports for utility functions
- Keep business logic within component or utility functions

### Error Handling
Always use the provided error handling utilities:
```typescript
try {
  const spotify = await getSpotifyClient();
  await safeApiCall(() => spotify.player.someAction());
  await showToast({ style: Toast.Style.Success, title: 'Success' });
} catch (error) {
  await handleSpotifyError(error, 'Default error message');
}
```

**Critical: Always wrap Spotify API calls with `safeApiCall()`** - it handles 204 No Content responses that the SDK fails to parse.

### Async Functions
- Always type async functions with proper return types
- Use `await showToast()` for user feedback on all operations

### TypeScript Configuration
- Strict mode enabled
- Target: ES2020
- Module: CommonJS
- Never use `as any` unless unavoidable (Spotify SDK types sometimes require it)

### Constants
Use UPPER_SNAKE_CASE for constants:
```typescript
const REDIRECT_URI = 'http://localhost:8888/callback';
const SCOPES = ['user-read-playback-state', ...];
```

### Comments
Use JSDoc comments for exported functions:
```typescript
/**
 * Format milliseconds to MM:SS format
 */
export function formatDuration(ms: number): string { ... }
```

### Vicinae API Patterns

**List Components** (searchable views):
```typescript
<List isLoading={isLoading} onSearchTextChange={...}>
  <List.EmptyView icon={Icon.Music} title="Empty" description="..." />
  {items.map(item => (
    <List.Item key={item.id} title={...} actions={<ActionPanel>...</ActionPanel>} />
  ))}
</List>
```

**Detail Components** (info views):
```typescript
<Detail markdown={...} metadata={<Detail.Metadata>...</Detail.Metadata>} actions={<ActionPanel>...</ActionPanel>} />
```

**Simple Commands** (no view):
```typescript
export default async function Command() {
  // Async function with no UI, just performs action and shows toast
}
```

### Authentication Flow
- Use `getSpotifyClient()` to get authenticated Spotify API instance
- Handles token refresh, OAuth flow, and caching automatically
- Never directly manage tokens - let the utility handle it

### Toast Notifications
Always provide user feedback:
```typescript
await showToast({
  style: Toast.Style.Success,  // or Failure, Animated
  title: 'Action Completed',
  message: 'Optional detail message'
});
```

## API References
- **@vicinae/api** - Vicinae extension API (UI components, utilities)
- **@spotify/web-api-ts-sdk** - Spotify Web API SDK
- **@types/react** - React type definitions

## Notes
- No linter or formatter configured - follow existing patterns
- OAuth flow runs on localhost:8888
- Token refresh happens automatically with 5-minute buffer
- Console logs use `[Vicify]` prefix for debugging
