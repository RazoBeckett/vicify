import { useState } from 'react';
import { List, ActionPanel, Action, Icon, showToast, Toast } from '@vicinae/api';
import { getSpotifyClient, handleSpotifyError, formatArtists, requireActiveDevice, safeApiCall } from './utils/spotify';
import type { Track, Artist, Album, Playlist } from './types/spotify';

type SearchResult = Track | Artist | Album | Playlist;

export default function SearchSpotify() {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<'track' | 'artist' | 'album' | 'playlist'>('track');

  async function performSearch(query: string) {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const spotify = await getSpotifyClient();
      
      const results = await spotify.search(query, [searchType]);
      
      let items: any[] = [];
      switch (searchType) {
        case 'track':
          items = results.tracks?.items || [];
          break;
        case 'artist':
          items = results.artists?.items || [];
          break;
        case 'album':
          items = results.albums?.items || [];
          break;
        case 'playlist':
          items = results.playlists?.items || [];
          break;
      }
      
      setSearchResults(items);
    } catch (error) {
      await handleSpotifyError(error, 'Failed to search Spotify');
    } finally {
      setIsLoading(false);
    }
  }

  async function playTrack(uri: string) {
    try {
      const spotify = await getSpotifyClient();
      const playbackState = await requireActiveDevice(spotify);
      if (!playbackState) return;
      await safeApiCall(() => spotify.player.startResumePlayback(undefined as any, undefined, [uri]));
      await showToast({
        style: Toast.Style.Success,
        title: 'Playing Track',
      });
    } catch (error) {
      await handleSpotifyError(error, 'Failed to play track');
    }
  }

  async function addToQueue(uri: string, name: string) {
    try {
      const spotify = await getSpotifyClient();
      const playbackState = await requireActiveDevice(spotify);
      if (!playbackState) return;
      await safeApiCall(() => spotify.player.addItemToPlaybackQueue(uri));
      await showToast({
        style: Toast.Style.Success,
        title: 'Added to Queue',
        message: name,
      });
    } catch (error) {
      await handleSpotifyError(error, 'Failed to add to queue');
    }
  }

  function getItemTitle(item: SearchResult): string {
    return 'name' in item ? item.name : 'Unknown';
  }

  function getItemSubtitle(item: SearchResult): string {
    if (searchType === 'track' || searchType === 'album') {
      const hasArtists = 'artists' in item && Array.isArray(item.artists);
      return hasArtists ? formatArtists(item.artists as Artist[]) : '';
    }
    if (searchType === 'playlist') {
      const hasTracks = 'tracks' in item && item.tracks !== null;
      return hasTracks ? `${(item.tracks as any).total} tracks` : '0 tracks';
    }
    if (searchType === 'artist') {
      const hasFollowers = 'followers' in item;
      return hasFollowers ? `${(item.followers as any).total} followers` : '';
    }
    return '';
  }

  function getItemIcon(item: SearchResult): string {
    // Images can be on the item directly (Album, Playlist, Artist in SDK) or nested (Track)
    const directImages = 'images' in item ? item.images : undefined;
    const albumImages = 'album' in item && item.album && 'images' in item.album ? item.album.images : undefined;
    const images = directImages || albumImages || [];
    return (images as any)[0]?.url || Icon.Music;
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(text) => {
        setSearchText(text);
        performSearch(text);
      }}
      searchBarPlaceholder={`Search ${searchType}s...`}
      searchBarAccessory={
         <List.Dropdown
           tooltip="Search Type"
           onChange={(newValue) => {
             setSearchType(newValue as any);
             performSearch(searchText);
           }}
        >
          <List.Dropdown.Item title="Tracks" value="track" />
          <List.Dropdown.Item title="Artists" value="artist" />
          <List.Dropdown.Item title="Albums" value="album" />
          <List.Dropdown.Item title="Playlists" value="playlist" />
        </List.Dropdown>
      }
    >
      {searchResults.length === 0 && !isLoading && searchText.length >= 2 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Results Found"
          description={`No ${searchType}s found for "${searchText}"`}
        />
      )}
      
      {searchResults.length === 0 && searchText.length < 2 && (
        <List.EmptyView
          icon={Icon.Music}
          title="Search Spotify"
          description={`Search for ${searchType}s on Spotify`}
        />
      )}

      {searchResults.map((item) => (
        <List.Item
          key={item.id}
          title={getItemTitle(item)}
          subtitle={getItemSubtitle(item)}
          icon={getItemIcon(item)}
          actions={
            <ActionPanel>
              {(searchType === 'track' || searchType === 'album' || searchType === 'playlist') && (
                <>
                  <Action
                    title="Play"
                    icon={Icon.Play}
                    onAction={() => playTrack(item.uri)}
                  />
                  <Action
                    title="Add to Queue"
                    icon={Icon.Plus}
                    onAction={() => addToQueue(item.uri, item.name)}
                    shortcut={{ modifiers: ['cmd'], key: 'q' }}
                  />
                </>
              )}
              <Action.OpenInBrowser
                title="Open in Spotify"
                url={item.external_urls?.spotify || ''}
              />
              <Action.CopyToClipboard
                title="Copy Spotify URI"
                content={item.uri}
                shortcut={{ modifiers: ['cmd'], key: 'c' }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
