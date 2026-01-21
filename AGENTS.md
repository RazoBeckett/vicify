# AGENTS.md - Vicinae Extension Development Guide

This guide helps AI agents work effectively in the Vicify (Spotify extension) codebase.

## Build & Development

### Commands
- `npm install` - Install dependencies (uses pnpm)
- `npm run dev` - Run in development mode with hot reload
- `npm run build` - Build production bundle

## Git Workflow

### Branch Naming Convention (STRICT)
Branch names MUST follow this pattern:
- `feat/<3-5-word-description>`
- `fix/<3-5-word-description>`
- `chore/<3-5-word-description>`
- `perf/<3-5-word-description>`
- `docs/<3-5-word-description>`
- `refactor/<3-5-word-description>`
- `test/<3-5-word-description>`

**Rules:**
- Names must be 3 to 5 words only (use hyphens as separators)
- No long branch names
- Branch prefix must match the type of work being done

Examples:
- ✅ `feat/add-user-auth-flow`
- ✅ `fix/resolve-login-timeout`
- ❌ `feat/add-the-new-user-authentication-flow-with-oauth-support`

### Conventional Commits (STRICT)
All commits MUST follow the Conventional Commits specification.
Reference: https://www.conventionalcommits.org/

**Format:** `<type>(<scope>): <description>`

**Types:**
- `feat` - A new feature
- `fix` - A bug fix
- `docs` - Documentation only changes
- `style` - Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor` - A code change that neither fixes a bug nor adds a feature
- `perf` - A code change that improves performance
- `test` - Adding missing tests or correcting existing tests
- `build` - Changes that affect the build system or external dependencies
- `ci` - Changes to our CI configuration files and scripts
- `chore` - Other changes that don't modify src or test files
- `revert` - Reverts a previous commit

**Examples:**
- `feat(auth): add PKCE authentication support`
- `fix(player): resolve playback state sync issue`
- `docs(readme): update installation instructions`

### Testing Requirement (CRITICAL)
**ALWAYS run tests after completing code changes.**
- Run the test suite before marking any task as complete
- If tests fail, fix them before proceeding
- If no tests exist for new code, consider adding them
- Currently no tests exist in this codebase - add testing infrastructure before writing tests

### Pull Request Creation
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

## Progress Documentation (CRITICAL)

### Documentation Structure
Create and maintain files in `docs/progress/` directory:

1. **`docs/progress/progress.md`** — Main progress tracker
   - Add completed tasks to "Recently Completed" section with date
   - Update "In Progress" items with percentage and status
   - Include technical details and sub-tasks completed

2. **`docs/progress/bugs-and-issues.md`** — Bug tracking
   - Mark bugs as fixed with solution description
   - Move to "Recently Fixed" section with strikethrough
   - Include fix date and assignee

3. **`docs/progress/deployment-log.md`** — Deployment history
   - Add new deployment entry with version number
   - Include changes, post-deployment checks, and metrics
   - Document any user feedback or incidents

4. **`docs/progress/temporary-decisions.md`** — Resolved technical decisions
   - Move temporary workarounds to "Recently Resolved" when fixed
   - Document the solution and original issue

5. **`docs/progress/tech-debt.md`** — Update when addressing technical debt
   - Mark items as resolved or update progress percentage
   - Add new debt items discovered during implementation

### Documentation Format

When documenting completed work, include:

- **What was implemented/fixed**
- **Date completed** (use Dec 31, 2025 format)
- **Who worked on it** (@username)
- **Technical details** (files changed, approach used)
- **Metrics or outcomes** (if applicable)

### Example Entry

```markdown
### Recently Completed (Dec 31, 2025)
- [x] **Dark theme implementation** — 100% complete
  - Theme context with React Context API
  - Theme toggle component with animated icons
  - LocalStorage persistence of user preference
  - System preference detection (prefers-color-scheme)
  - Smooth transition animations between themes
```

## Project Structure

- **src/** - All source code
  - **utils/spotify.ts** - Shared Spotify API utilities (authentication, error handling, formatting)
  - **Command files** - Each file (e.g., `toggle-play-pause.tsx`) is a Vicinae command, one per file
- **docs/progress/** - Progress documentation files
- **assets/** - Static assets

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

## Authentication Flow
- Use `getSpotifyClient()` to get authenticated Spotify API instance
- Handles token refresh, OAuth flow, and caching automatically
- Never directly manage tokens - let the utility handle it

## Toast Notifications
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
