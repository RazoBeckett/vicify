import { useState } from 'react';
import { List, ActionPanel, Action, Icon, showToast, Toast } from '@vicinae/api';
import {
  getSpotifyClient,
  handleSpotifyError,
  formatArtists,
  requireActiveDevice,
  safeApiCall,
  playTrack as playTrackByUri,
} from './utils/spotify';
import type { Track, Artist, Album, Playlist, Image } from './types/spotify';

type SearchResult = Track | Artist | Album | Playlist;
type SearchType = 'track' | 'artist' | 'album' | 'playlist';

const SEARCH_TYPES: readonly string[] = ['track', 'artist', 'album', 'playlist'];

function isSearchType(value: string): value is SearchType {
  return SEARCH_TYPES.includes(value);
}

const MAX_SEARCH_QUERY_LENGTH = 200;
const MIN_SEARCH_QUERY_LENGTH = 2;
// February 2026 lowered the /search `limit` maximum from 50 to 10
const SEARCH_RESULT_LIMIT = 10;

/**
 * Normalize a raw search box value before it reaches the Spotify API.
 * Search results are never rendered as raw HTML, so this is input hygiene
 * rather than HTML escaping: strip angle brackets and quotes, then cap length.
 */
function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .slice(0, MAX_SEARCH_QUERY_LENGTH)
    .replace(/[<>\"']/g, '');
}

export default function SearchSpotify() {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>('track');

  async function performSearch(query: string): Promise<void> {
    const sanitizedQuery = sanitizeSearchQuery(query);
    setSearchText(sanitizedQuery);

    if (sanitizedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const spotify = await getSpotifyClient();
      
      const results = await spotify.search(sanitizedQuery, [searchType], undefined, SEARCH_RESULT_LIMIT);
      
      let items: SearchResult[] = [];
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
      const started = await playTrackByUri(uri);
      if (!started) return;
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
    return item.name;
  }

  function getItemSubtitle(item: SearchResult): string {
    if ('artists' in item) {
      return formatArtists(item.artists);
    }
    if ('tracks' in item) {
      return item.tracks ? `${item.tracks.total} tracks` : '0 tracks';
    }
    if ('followers' in item && item.followers) {
      return `${item.followers.total} followers`;
    }
    return '';
  }

  /**
   * Artists, albums and playlists carry images directly; tracks carry them on
   * their album. Narrowing on the property keeps this free of casts.
   */
  function getItemImages(item: SearchResult): Image[] {
    if ('images' in item && Array.isArray(item.images)) {
      return item.images;
    }
    if ('album' in item && item.album && Array.isArray(item.album.images)) {
      return item.album.images;
    }
    return [];
  }

  function getItemIcon(item: SearchResult): string {
    return getItemImages(item)[0]?.url || Icon.Music;
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={performSearch}
      searchBarPlaceholder={`Search ${searchType}s...`}
      searchBarAccessory={
         <List.Dropdown
           tooltip="Search Type"
           onChange={(newValue) => {
             if (!isSearchType(newValue)) return;
             setSearchType(newValue);
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

      {searchResults.map((item) => {
        const itemKey = item.id;
        const itemUri = item.uri;
        return (
        <List.Item
          key={itemKey}
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
                    onAction={() => playTrack(itemUri)}
                  />
                  <Action
                    title="Add to Queue"
                    icon={Icon.Plus}
                    onAction={() => addToQueue(itemUri, item.name)}
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
                content={itemUri}
                shortcut={{ modifiers: ['cmd'], key: 'c' }}
              />
            </ActionPanel>
          }
        />
      )})}
    </List>
  );
}
