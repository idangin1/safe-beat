import { ContentMode, ContentPlatform, PlaylistItem } from '../types';

const playlists: Record<ContentMode, PlaylistItem[]> = {
  calm: require('../../data/playlists/calm.json') as PlaylistItem[],
  funny: require('../../data/playlists/funny.json') as PlaylistItem[],
  kids: require('../../data/playlists/kids.json') as PlaylistItem[],
};

function pick(list: PlaylistItem[]): PlaylistItem {
  return list[Math.floor(Math.random() * list.length)];
}

export function selectContent(mode: ContentMode, platform: ContentPlatform = 'youtube'): PlaylistItem {
  const list = playlists[mode];
  if (!list || list.length === 0) {
    throw new Error(`No playlist items for mode: ${mode}`);
  }
  const filtered = list.filter((item) => item.platform === platform);
  return filtered.length > 0 ? pick(filtered) : pick(list);
}
