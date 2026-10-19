import { useState, useEffect } from 'react';
import { Detail, ActionPanel, Action, Icon } from '@vicinae/api';
import { getSpotifyClient, handleSpotifyError, formatArtists, formatDuration, validateTrack, validatePlayback } from './utils/spotify';
import type { Track, PlaybackState } from './types/spotify';

export default function CurrentTrack() {
  const [track, setTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playback, setPlayback] = useState<PlaybackState | null>(null);

  useEffect(() => {
    loadCurrentTrack();
  }, []);

  async function loadCurrentTrack() {
    try {
      const spotify = await getSpotifyClient();
      const currentPlayback = await spotify.player.getCurrentlyPlayingTrack();
      
      if (currentPlayback && currentPlayback.item) {
        // Playback can return a podcast episode, which has no artists/album
        setTrack(validateTrack(currentPlayback.item));
        setIsPlaying(currentPlayback.is_playing);
        setPlayback(validatePlayback(currentPlayback));
      } else {
        setTrack(null);
        setPlayback(null);
      }
    } catch (error) {
      await handleSpotifyError(error, 'Failed to load current track');
    }
  }

  if (!track) {
    return (
      <Detail
        markdown="# No Track Playing\n\nStart playing something on Spotify."
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

  const coverArt = track.album?.images?.[0]?.url || '';
  const artistNames = formatArtists(track.artists);
  const albumName = track.album?.name || 'Unknown Album';
  const trackDuration = formatDuration(track.duration_ms);
  const releaseDate = track.album?.release_date ? new Date(track.album.release_date).getFullYear() : 'Unknown';
  const explicit = track.explicit ? '🅴' : '';

  // February 2026 removed `popularity` from Track responses
  const popularity =
    typeof track.popularity === 'number'
      ? `${'⭐'.repeat(Math.floor(track.popularity / 20))} ${track.popularity}/100`
      : 'Not available';
  
  // Calculate progress if available
  let progressBar = '';
  let progressText = '';
  if (playback?.progress_ms !== undefined) {
    const progress = playback.progress_ms;
    const total = track.duration_ms;
    const percentage = Math.floor((progress / total) * 100);
    const filled = Math.floor(percentage / 5);
    const empty = 20 - filled;
    progressBar = '█'.repeat(filled) + '░'.repeat(empty);
    progressText = `${formatDuration(progress)} / ${trackDuration}`;
  }

  const markdown = `
<img src="${coverArt}" alt="Album Cover" width="300" height="300" />

# ${isPlaying ? '▶️' : '⏸️'} ${track.name} ${explicit}

---

## Track Information

| | |
|---|---|
| **Artist** | ${artistNames} |
| **Album** | ${albumName} |
| **Duration** | ${trackDuration} |
| **Release Year** | ${releaseDate} |
| **Popularity** | ${popularity} |
| **Type** | ${track.type} |

${progressBar ? `\n---\n\n### Playback Progress\n\n\`${progressBar}\`\n\n${progressText}\n` : ''}

---

### Artist Links

${track.artists.map((artist: any, index: number) => `${index + 1}. [${artist.name}](${artist.external_urls?.spotify || '#'})`).join('\n')}

---

### Album Details

**Total Tracks:** ${track.album?.total_tracks || 'Unknown'}  
**Album Type:** ${track.album?.album_type || 'Unknown'}

${track.album?.external_urls?.spotify ? `\n[Open Album in Spotify](${track.album.external_urls.spotify})` : ''}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={isPlaying ? 'Playing' : 'Paused'} icon={isPlaying ? Icon.Play : Icon.Pause} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Track" text={track.name} />
          <Detail.Metadata.Label title="Artist" text={artistNames} />
          <Detail.Metadata.Label title="Album" text={albumName} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Duration" text={trackDuration} />
          <Detail.Metadata.Label title="Popularity" text={popularity} />
          {track.explicit && <Detail.Metadata.Label title="Explicit" text="Yes" icon={Icon.ExclamationMark} />}
          <Detail.Metadata.Separator />
          {playback?.device && (
            <>
              <Detail.Metadata.Label title="Device" text={playback.device.name} icon={Icon.ComputerChip} />
              <Detail.Metadata.Label title="Volume" text={`${playback.device.volume_percent}%`} icon={Icon.SpeakerOn} />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={loadCurrentTrack}
            shortcut={{ modifiers: ['cmd'], key: 'r' }}
          />
          <Action.OpenInBrowser
            title="Open Track in Spotify"
            url={track.external_urls?.spotify || ''}
          />
          <Action.OpenInBrowser
            title="Open Album in Spotify"
            url={track.album?.external_urls?.spotify || ''}
          />
          <Action.OpenInBrowser
            title="Open Artist in Spotify"
            url={track.artists?.[0]?.external_urls?.spotify || ''}
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
