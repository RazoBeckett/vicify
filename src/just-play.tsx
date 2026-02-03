import { showToast, Toast } from '@vicinae/api';
import { getSpotifyClient, handleSpotifyError, requireActiveDevice, safeApiCall } from './utils/spotify';

export default async function Command() {
  try {
    const spotify = await getSpotifyClient();
    const playbackState = await requireActiveDevice(spotify);
    if (!playbackState) return;
    await safeApiCall(() => spotify.player.startResumePlayback(undefined as any));
    
    await showToast({
      style: Toast.Style.Success,
      title: 'Playback Started',
    });
  } catch (error) {
    await handleSpotifyError(error, 'Failed to start playback');
  }
}
