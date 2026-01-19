import { List, ActionPanel, Action, Icon, showToast, Toast, LaunchProps } from '@vicinae/api';
import { getSpotifyClient, handleSpotifyError, formatArtists } from './utils/spotify';
import { useState, useEffect } from 'react';

interface Arguments {
  query?: string;
}

export default function FollowArtists(props: LaunchProps<{ arguments: Arguments }>) {
  const [artists, setArtists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const { query } = props.arguments || {};

  useEffect(() => {
    if (query) {
      setSearchText(query);
      searchArtists(query);
    } else {
      loadFollowedArtists();
    }
  }, [query]);

  async function loadFollowedArtists() {
    try {
      setIsLoading(true);
      const spotify = await getSpotifyClient();
      const followed = await spotify.currentUser.followedArtists();
      setArtists(followed.artists.items || []);
    } catch (error) {
      await handleSpotifyError(error, 'Failed to load followed artists');
    } finally {
      setIsLoading(false);
    }
  }

  async function searchArtists(query: string) {
    if (!query || query.length < 2) {
      setArtists([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const spotify = await getSpotifyClient();
      const results = await spotify.search(query, ['artist']);
      setArtists(results.artists?.items || []);
    } catch (error) {
      await handleSpotifyError(error, 'Failed to search artists');
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleFollow(artistId: string, artistName: string, isFollowing: boolean) {
    try {
      const spotify = await getSpotifyClient();
      
      if (isFollowing) {
        await spotify.currentUser.unfollow([artistId]);
        await showToast({
          style: Toast.Style.Success,
          title: 'Unfollowed',
          message: `Stopped following ${artistName}`
        });
      } else {
        await spotify.currentUser.followArtists([artistId]);
        await showToast({
          style: Toast.Style.Success,
          title: 'Following',
          message: `Now following ${artistName}`
        });
      }

      // Refresh the list
      if (searchText) {
        await searchArtists(searchText);
      } else {
        await loadFollowedArtists();
      }
    } catch (error) {
      await handleSpotifyError(error, 'Failed to toggle follow');
    }
  }

  async function openArtistPage(url: string) {
    return window.open(url, '_blank');
  }

  function getArtistIcon(images: any[]): string {
    return images?.[0]?.url || Icon.Music;
  }

  function getFollowersText(followers: number): string {
    return followers ? `${followers.toLocaleString()} followers` : 'No followers';
  }

  if (isLoading && artists.length === 0) {
    return <List isLoading />;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search artists..."
      onSearchTextChange={(text) => {
        setSearchText(text);
        if (text) {
          searchArtists(text);
        } else {
          loadFollowedArtists();
        }
      }}
    >
      {artists.length === 0 && !isLoading && searchText.length >= 2 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Artists Found"
          description={`No artists found for "${searchText}"`}
        />
      )}

      {artists.length === 0 && !isLoading && !searchText && (
        <List.EmptyView
          icon={Icon.Music}
          title="No Followed Artists"
          description="Search for artists or follow some to see them here"
        />
      )}

      {artists.map((artist) => (
        <List.Item
          key={artist.id}
          title={artist.name}
          subtitle={getFollowersText(artist.followers?.total)}
          icon={getArtistIcon(artist.images)}
          accessories={[
            { icon: Icon.Heart, tooltip: 'Follow Status' }
          ]}
          actions={
            <ActionPanel>
              <Action
                title={artist.is_following ? 'Unfollow' : 'Follow'}
                icon={artist.is_following ? Icon.HeartDisabled : Icon.Heart}
                onAction={() => toggleFollow(artist.id, artist.name, artist.is_following)}
                shortcut={{ modifiers: ['cmd'], key: 'f' }}
              />
              <Action.OpenInBrowser
                title="Open in Spotify"
                url={artist.external_urls?.spotify || ''}
              />
              <Action.CopyToClipboard
                title="Copy Artist URL"
                content={artist.external_urls?.spotify || ''}
                shortcut={{ modifiers: ['cmd'], key: 'c' }}
              />
              <Action
                title="View Top Tracks"
                icon={Icon.Music}
                onAction={() => window.open(`${artist.external_urls?.spotify}/top-tracks`, '_blank')}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
