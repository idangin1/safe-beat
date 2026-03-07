export type ContentMode = 'מרגיע' | 'מצחיק' | 'ילדים';
export type ContentPlatform = 'youtube' | 'spotify';

export interface User {
  telegramId: number;
  chatId: number;
  city: string;          // normalized lowercase
  mode: ContentMode;
  platform: ContentPlatform;
  subscribedAt: number;
  active: boolean;
  username?: string;
}

export interface NormalizedAlert {
  id: string;            // sha256(sorted cities + time)[:16]
  cities: string[];      // lowercase, trimmed
  title: string;
  receivedAt: number;
}

export interface PlaylistItem {
  id: string;
  platform: 'youtube' | 'spotify';
  url: string;
  title: string;
}

export interface RawAlert {
  id: string;
  cat?: string;
  title: 'ירי רקטות וטילים' | 'בדקות הקרובות צפויות להתקבל התרעות באזורך';
  data?: string[];
  description?: string;
}
