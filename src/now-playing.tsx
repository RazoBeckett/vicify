import { useState, useEffect } from 'react';
import { Detail, ActionPanel, Action, Icon } from '@vicinae/api';
import { getSpotifyClient, handleSpotifyError, formatArtists, formatDuration, formatPopularity, requireActiveDevice, safeApiCall, validateTrack, validateDevice } from './utils/spotify';
import type { Track, Device } from './types/spotify';

export default function CurrentlyPlaying() {
  const [track, setTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [device, setDevice] = useState<Device | null>(null);

  useEffect(() => {
    loadCurrentTrack();
    
    const interval = setInterval(() => {
      loadCurrentTrack();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  async function loadCurrentTrack() {
    try {
      const spotify = await getSpotifyClient();
      const playback = await spotify.player.getCurrentlyPlayingTrack();
      
      if (playback && playback.item) {
        // Playback can return a podcast episode, which has no artists/album
        setTrack(validateTrack(playback.item));
        setIsPlaying(playback.is_playing);
        setProgress(playback.progress_ms || 0);
        setDevice(validateDevice(playback.device));
      } else {
        setTrack(null);
      }
    } catch (error) {
      await handleSpotifyError(error, 'Failed to load currently playing track');
    }
  }

  async function togglePlayPause() {
    try {
      const spotify = await getSpotifyClient();
      const playbackState = await requireActiveDevice(spotify);
      if (!playbackState) return;
      
      if (isPlaying) {
        await safeApiCall(() => spotify.player.pausePlayback(undefined as any));
        setIsPlaying(false);
      } else {
        await safeApiCall(() => spotify.player.startResumePlayback(undefined as any));
        setIsPlaying(true);
      }
    } catch (error) {
      await handleSpotifyError(error, 'Failed to toggle playback');
    }
  }

  if (!track) {
    return (
      <Detail
        markdown="# No Track Playing\n\nStart playing something on Spotify to see it here."
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={loadCurrentTrack}
            />
          </ActionPanel>
        }
      />
    );
  }

  const albumArt = track.album?.images?.[0]?.url || '';
  const progressPercent = Math.round((progress / track.duration_ms) * 100);
  
  const markdown = `
# ${track.name}

![Album Art](${albumArt})

## ${formatArtists(track.artists)}

**Album:** ${track.album?.name || 'Unknown'}

**Duration:** ${formatDuration(track.duration_ms)}

**Progress:** ${formatDuration(progress)} / ${formatDuration(track.duration_ms)} (${progressPercent}%)

**Device:** ${device?.name || 'Unknown'} (${device?.type || 'Unknown'})

**Status:** ${isPlaying ? '▶️ Playing' : '⏸️ Paused'}

${formatPopularity(track.popularity)}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Track" text={track.name} />
          <Detail.Metadata.Label title="Artist" text={formatArtists(track.artists)} />
          <Detail.Metadata.Label title="Album" text={track.album?.name || 'Unknown'} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label 
            title="Duration" 
            text={formatDuration(track.duration_ms)} 
          />
          <Detail.Metadata.Label 
            title="Progress" 
            text={`${formatDuration(progress)} (${progressPercent}%)`} 
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Device" text={device?.name || 'Unknown'} />
          <Detail.Metadata.Label 
            title="Status" 
            text={isPlaying ? 'Playing' : 'Paused'} 
          />
          <Detail.Metadata.Label
            title="Popularity"
            text={track.popularity === undefined ? 'Unavailable' : `${track.popularity}/100`} 
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title={isPlaying ? 'Pause' : 'Play'}
            icon={isPlaying ? Icon.Pause : Icon.Play}
            onAction={togglePlayPause}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={loadCurrentTrack}
            shortcut={{ modifiers: ['cmd'], key: 'r' }}
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
        </ActionPanel>
      }
    />
  );
}
