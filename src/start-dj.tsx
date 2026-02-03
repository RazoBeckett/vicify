import { showToast, Toast } from '@vicinae/api';
import { getSpotifyClient, handleSpotifyError, requireActiveDevice, safeApiCall } from './utils/spotify';

export default async function Command() {
  try {
    const spotify = await getSpotifyClient();
    const playbackState = await requireActiveDevice(spotify);
    if (!playbackState) return;
    
    // Start DJ by playing the DJ playlist (this is Spotify's AI DJ feature)
    // The DJ playlist URI is a special Spotify feature
    const djUri = 'spotify:playlist:37i9dQZF1EYkqdzj48dyYq';
    
    await safeApiCall(() => spotify.player.startResumePlayback(undefined as any, djUri));
    
    await showToast({
      style: Toast.Style.Success,
      title: 'DJ Started',
      message: 'Enjoy your personalized mix',
    });
  } catch (error) {
    await handleSpotifyError(error, 'Failed to start DJ');
  }
}
