import { showToast, Toast, Clipboard } from '@vicinae/api';
import { handleSpotifyError, withCurrentTrack } from './utils/spotify';

const SPOTIFY_ID_REGEX = /^[A-Za-z0-9]{22}$/;

class InvalidTrackIdError extends Error {
  constructor() {
    super('Invalid Spotify track ID format');
    this.name = 'InvalidTrackIdError';
  }
}

/**
 * Validate a track ID before interpolating it into the embed iframe URL.
 * The ID is interpolated into an HTML attribute, so anything outside the
 * base62 character set has to be rejected rather than escaped.
 */
function validateSpotifyId(value: string): string {
  const trimmed = value.trim();
  if (!SPOTIFY_ID_REGEX.test(trimmed)) {
    throw new InvalidTrackIdError();
  }
  return trimmed;
}

export default async function Command(): Promise<void> {
  try {
    const copied = await withCurrentTrack(async (track) => {
      const trackId = validateSpotifyId(track.id);
      const embedCode = `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/track/${trackId}" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
      await Clipboard.copy(embedCode);
      return true;
    });

    if (!copied) return;

    await showToast({
      style: Toast.Style.Success,
      title: 'Copied Embed Code',
      message: 'Paste in your HTML',
    });
  } catch (error) {
    if (error instanceof InvalidTrackIdError) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Invalid Track',
        message: 'Could not generate embed code',
      });
      return;
    }
    await handleSpotifyError(error, 'Failed to copy embed code');
  }
}
