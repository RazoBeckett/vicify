import { useState, useEffect } from 'react';
import { List, ActionPanel, Action, Icon, showToast, Toast } from '@vicinae/api';
import { getSpotifyClient, handleSpotifyError, spotifyFetch, getCurrentTrack } from './utils/spotify';
import type { Playlist, Track } from './types/spotify';

export default function AddToPlaylist() {
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

  async function addToPlaylist(playlistId: string, playlistName: string) {
    if (!currentTrack) return;
    
    try {
      // Ensure we have a valid token (refreshes or re-auths as needed)
      await getSpotifyClient();
      await spotifyFetch('POST', `/playlists/${encodeURIComponent(playlistId)}/items`, {
        uris: [currentTrack.uri],
      });
      
      await showToast({
        style: Toast.Style.Success,
        title: 'Added to Playlist',
        message: `${currentTrack.name} added to ${playlistName}`,
      });
    } catch (error) {
      await handleSpotifyError(error, 'Failed to add track to playlist');
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
          icon={Icon.AppWindowList}
          title="No Playlists Found"
          description="Create a playlist on Spotify first"
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
                title="Add Track to Playlist"
                icon={Icon.Plus}
                onAction={() => addToPlaylist(playlist.id, playlist.name)}
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
