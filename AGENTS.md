# AGENTS.md - Vicinae Extension Development Guide

This guide helps AI agents work effectively in the Vicify (Spotify extension) codebase.

## Build & Development

### Commands
- `npm install` - Install dependencies (uses pnpm)
- `npm run dev` - Run in development mode with hot reload
- `npm run build` - Build production bundle

### Testing
No tests currently exist in this codebase. Add testing infrastructure before writing tests.

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
