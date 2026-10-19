import { showToast, Toast } from '@vicinae/api';
import { getSpotifyClient, handleSpotifyError, formatArtists, requireActiveDevice, safeApiCall, getCurrentTrack } from './utils/spotify';

export default async function Command(): Promise<void> {
  try {
    const spotify = await getSpotifyClient();
    const playbackState = await requireActiveDevice(spotify);
    if (!playbackState) return;

    const trackItem = await getCurrentTrack();
    if (!trackItem) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'No Track Playing',
        message: 'Please start playing a track first',
      });
      return;
    }

    const trackId = trackItem.id;
    const trackUri = `spotify:track:${trackId}`;
    
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
    
    const trackUris = [trackUri, ...recommendations.tracks.map(t => t.uri)];
    // @ts-expect-error SDK types don't properly handle optional device_id
    await safeApiCall(() => spotify.player.startResumePlayback(undefined, undefined, trackUris));
    
    const trackName = trackItem.name;
    const artistNames = formatArtists(trackItem.artists);
    
    await showToast({
      style: Toast.Style.Success,
      title: 'Radio Started',
      message: `Based on ${trackName} - ${artistNames}`,
    });
  } catch (error) {
    await handleSpotifyError(error, 'Failed to start radio');
  }
}
