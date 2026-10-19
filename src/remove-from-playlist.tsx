import { useState, useEffect } from 'react';
import { List, ActionPanel, Action, Icon, showToast, Toast } from '@vicinae/api';
import { getSpotifyClient, handleSpotifyError, spotifyFetch, getCurrentTrack } from './utils/spotify';
import type { Playlist, Track } from './types/spotify';

export default function RemoveFromPlaylist() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const spotify = await getSpotifyClient();

      // getCurrentTrack already surfaces a toast when nothing is playing
      const track = await getCurrentTrack();
      if (!track) {
        setIsLoading(false);
        return;
      }
      setCurrentTrack(track);

      // Get user's playlists
      const userPlaylists = await spotify.currentUser.playlists.playlists(50);
      setPlaylists(userPlaylists.items || []);
    } catch (error) {
      await handleSpotifyError(error, 'Failed to load playlists');
    } finally {
      setIsLoading(false);
    }
  }

  async function removeFromPlaylist(playlistId: string, playlistName: string) {
    if (!currentTrack) return;
    
    try {
      // Ensure we have a valid token (refreshes or re-auths as needed)
      await getSpotifyClient();
      await spotifyFetch(
        'DELETE',
        `/playlists/${encodeURIComponent(playlistId)}/items`,
        // February 2026 renamed the body field `tracks` -> `items`
        { items: [{ uri: currentTrack.uri }] }
      );
      
      await showToast({
        style: Toast.Style.Success,
        title: 'Removed from Playlist',
        message: `${currentTrack.name} removed from ${playlistName}`,
      });
    } catch (error) {
      await handleSpotifyError(error, 'Failed to remove track from playlist');
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search playlists...">
      {!currentTrack && !isLoading && (
        <List.EmptyView
          icon={Icon.Music}
          title="No Track Playing"
          description="Please start playing a track first"
        />
      )}
      
      {currentTrack && playlists.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.List}
          title="No Playlists Found"
          description="You don't have any playlists"
        />
      )}
      
      {currentTrack && playlists.map((playlist) => (
        <List.Item
          key={playlist.id}
          title={playlist.name}
          subtitle={`${playlist.tracks?.total || 0} tracks`}
          icon={playlist.images?.[0]?.url || Icon.Music}
          accessories={[
            { text: playlist.owner?.display_name || 'Unknown' }
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Remove Track from Playlist"
                icon={Icon.Trash}
                onAction={() => removeFromPlaylist(playlist.id, playlist.name)}
              />
              <Action.OpenInBrowser
                title="Open in Spotify"
                url={playlist.external_urls?.spotify || ''}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
