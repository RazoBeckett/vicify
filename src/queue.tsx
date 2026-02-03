import { useState, useEffect } from 'react';
import { List, ActionPanel, Action, Icon, showToast, Toast } from '@vicinae/api';
import { getSpotifyClient, handleSpotifyError, formatArtists, formatDuration, safeApiCall } from './utils/spotify';
import type { Track } from './types/spotify';

export default function ViewQueue() {
  const [queue, setQueue] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadQueue();
  }, []);

   async function loadQueue() {
     try {
       setIsLoading(true);
       const spotify = await getSpotifyClient();
       const queueData = await spotify.player.getUsersQueue();
       
       // @ts-expect-error SDK returns Track | Episode, we handle both as unknown
       setCurrentTrack(queueData.currently_playing);
       setQueue(queueData.queue || []);
    } catch (error) {
      await handleSpotifyError(error, 'Failed to load queue');
    } finally {
      setIsLoading(false);
    }
  }

   async function playTrack(uri: string) {
     try {
       const spotify = await getSpotifyClient();
       await safeApiCall(() => spotify.player.startResumePlayback(undefined as any, undefined, [uri]));
      await showToast({
        style: Toast.Style.Success,
        title: 'Playing Track',
      });
      await loadQueue();
    } catch (error) {
      await handleSpotifyError(error, 'Failed to play track');
    }
  }

   async function skipToNext() {
     try {
       const spotify = await getSpotifyClient();
       await safeApiCall(() => spotify.player.skipToNext(undefined as any));
      await showToast({
        style: Toast.Style.Success,
        title: 'Skipped to Next',
      });
      setTimeout(loadQueue, 500);
    } catch (error) {
      await handleSpotifyError(error, 'Failed to skip');
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search queue...">
      {currentTrack && (
        <List.Section title="Now Playing">
          <List.Item
            title={currentTrack.name}
            subtitle={formatArtists(currentTrack.artists)}
            icon={currentTrack.album?.images?.[0]?.url || Icon.Music}
            accessories={[
              { text: formatDuration(currentTrack.duration_ms) },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Skip to Next"
                  icon={Icon.Forward}
                  onAction={skipToNext}
                />
                <Action.OpenInBrowser
                  title="Open in Spotify"
                  url={currentTrack.external_urls?.spotify || ''}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={loadQueue}
                  shortcut={{ modifiers: ['cmd'], key: 'r' }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title={`Up Next (${queue.length} tracks)`}>
        {queue.length === 0 && !isLoading && (
          <List.EmptyView
            icon={Icon.List}
            title="Queue is Empty"
            description="Add tracks to your queue to see them here"
          />
        )}
        
        {queue.map((track, index) => (
          <List.Item
            key={`${track.id}-${index}`}
            title={track.name}
            subtitle={formatArtists(track.artists)}
            icon={track.album?.images?.[0]?.url || Icon.Music}
            accessories={[
              { text: `#${index + 1}` },
              { text: formatDuration(track.duration_ms) },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Play Now"
                  icon={Icon.Play}
                  onAction={() => playTrack(track.uri)}
                />
                <Action.OpenInBrowser
                  title="Open in Spotify"
                  url={track.external_urls?.spotify || ''}
                />
                <Action.CopyToClipboard
                  title="Copy Track URI"
                  content={track.uri}
                  shortcut={{ modifiers: ['cmd'], key: 'c' }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={loadQueue}
                  shortcut={{ modifiers: ['cmd'], key: 'r' }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
