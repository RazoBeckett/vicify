import { showToast, Toast } from '@vicinae/api';
import { getSpotifyClient, handleSpotifyError, formatArtists, requireActiveDevice, safeApiCall } from './utils/spotify';

export default async function Command() {
  try {
    const spotify = await getSpotifyClient();
    const playbackState = await requireActiveDevice(spotify);
    if (!playbackState) return;
    const currentTrack = await spotify.player.getCurrentlyPlayingTrack();
    
    if (!currentTrack || !currentTrack.item) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'No Track Playing',
        message: 'Please start playing a track first',
      });
      return;
    }
    
    const trackId = currentTrack.item.id;
    const trackUri = `spotify:track:${trackId}`;
    
    // Get recommendations based on the current track
    const recommendations = await spotify.recommendations.get({
      seed_tracks: [trackId],
      limit: 50,
    });
    
    if (!recommendations.tracks || recommendations.tracks.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'No Recommendations',
        message: 'Could not find similar tracks',
      });
      return;
    }
    
    // Start playback with the recommendations
    const trackUris = [trackUri, ...recommendations.tracks.map(t => t.uri)];
    await safeApiCall(() => spotify.player.startResumePlayback(undefined as any, undefined, trackUris));
    
    const trackName = currentTrack.item.name;
    const artistNames = formatArtists((currentTrack.item as any).artists || []);
    
    await showToast({
      style: Toast.Style.Success,
      title: 'Radio Started',
      message: `Based on ${trackName} - ${artistNames}`,
    });
  } catch (error) {
    await handleSpotifyError(error, 'Failed to start radio');
  }
}
