import { showToast, Toast } from '@vicinae/api';
import { getSpotifyClient, handleSpotifyError, safeApiCall } from './utils/spotify';

/**
 * Set volume to a specific preset value (0, 25, 50, 75, or 100).
 * Used by both direct command invocation and stub forwarder files.
 */
export async function setVolumePreset(preset: 0 | 25 | 50 | 75 | 100): Promise<void> {
  try {
    const spotify = await getSpotifyClient();
    await safeApiCall(() => spotify.player.setPlaybackVolume(preset, undefined as any));

    await showToast({
      style: Toast.Style.Success,
      title: `Volume Set to ${preset}%`,
    });
  } catch (error) {
    await handleSpotifyError(error, 'Failed to set volume');
  }
}

/**
 * Default command export - sets volume to 50% when invoked directly.
 * Stub forwarder files will import setVolumePreset() and call with their specific value.
 */
export default async function Command() {
  await setVolumePreset(50);
}
