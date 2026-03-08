import { ContentMode, ContentPlatform, PlaylistItem } from '../types';
import {logger} from "../logger";

const playlists: Record<ContentMode, PlaylistItem[]> = {
  מרגיע: require('../../data/playlists/calm.json') as PlaylistItem[],
  מצחיק: require('../../data/playlists/funny.json') as PlaylistItem[],
  ילדים: require('../../data/playlists/kids.json') as PlaylistItem[],
  קצבי: require('../../data/playlists/upbeat.json') as PlaylistItem[],
};

function pick(list: PlaylistItem[]): PlaylistItem {
  return list[Math.floor(Math.random() * list.length)];
}

export function selectContent(modes: ContentMode[], platforms: ContentPlatform[]): PlaylistItem {
  const mode = modes[Math.floor(Math.random() * modes.length)];
  const platform = platforms[Math.floor(Math.random() * platforms.length)];
  const list = playlists[mode];
  if (!list || list.length === 0) {
    throw new Error(`No playlist items for mode: ${mode}`);
  }
  logger.info('before filter: ' + JSON.stringify(list))
  const filtered = list.filter((item) => item.platform === platform);
  logger.info('after filter: ' + JSON.stringify(filtered))
  return filtered.length > 0 ? pick(filtered) : pick(list);
}
