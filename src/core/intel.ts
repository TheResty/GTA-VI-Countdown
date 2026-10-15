/**
 * Intel-Feed: kuratierte Meldungen plus eigene Einträge aus dem Browser.
 */
import { NEWS, NewsKind, NewsSource } from '../data/news';
import { emit } from './bus';
import { load, save } from './store';
import { TZ } from './timeline';
import { DAY_MS, HOUR_MS, parseLocal } from './tz';

export interface OwnNews {
  id: string;
  at: number;
  kind: NewsKind;
  title: string;
  text: string;
  url?: string;
}

export interface FeedItem {
  id: string;
  at: number;
  approx: boolean;
  /** Uhrzeit bekannt */
  timed: boolean;
  kind: NewsKind;
  title: string;
  text: string;
  facts: string[];
  spoiler: boolean;
  sources: NewsSource[];
  own: boolean;
}

export const NEWS_KIND_LABEL: Record<NewsKind, string> = {
  trailer: 'Trailer',
  official: 'Offiziell',
  leak: 'Leak · unbestätigt',
  report: 'Bericht',
};

export const NEWS_KIND_COLOR: Record<NewsKind, string> = {
  trailer: '#19f0ff',
  official: '#ffd23f',
  leak: '#9b6bff',
  report: '#ff8a3d',
};

/** Wie lange eine offizielle Meldung als „Eilmeldung“ gilt */
export const BREAKING_MS = 72 * HOUR_MS;

const curated: FeedItem[] = NEWS.map((n) => ({
  id: n.id,
  at: parseLocal(n.at, TZ),
  approx: Boolean(n.approx),
  timed: n.at.includes('T'),
  kind: n.kind,
  title: n.title,
  text: n.text,
  facts: n.facts ?? [],
  spoiler: Boolean(n.spoiler),
  sources: n.sources ?? [],
  own: false,
}));

let own = load<OwnNews[]>('intel-own', []);

export const isHttpUrl = (url: string): boolean => /^https?:\/\/\S+$/i.test(url.trim());

export function feed(now: number): FeedItem[] {
  const mine: FeedItem[] = own.map((n) => ({
    id: n.id,
    at: n.at,
    approx: false,
    timed: true,
    kind: n.kind,
    title: n.title,
    text: n.text,
    facts: [],
    spoiler: false,
    sources: n.url && isHttpUrl(n.url) ? [{ label: 'Link', url: n.url }] : [],
    own: true,
  }));
  return [...curated, ...mine].filter((n) => n.at <= now).sort((a, b) => b.at - a.at);
}

/** Neueste offizielle Meldung (Trailer/Ankündigung), unabhängig vom Alter */
export function latestOfficial(now: number): FeedItem | null {
  return curated.filter((n) => n.at <= now && (n.kind === 'trailer' || n.kind === 'official')).sort((a, b) => b.at - a.at)[0] ?? null;
}

export function breaking(now: number): FeedItem | null {
  const n = latestOfficial(now);
  return n && now - n.at < BREAKING_MS ? n : null;
}

export function addOwn(n: Omit<OwnNews, 'id'>): void {
  own = [...own, { ...n, id: `own-${Date.now().toString(36)}` }];
  save('intel-own', own);
  emit('intel', undefined);
}

export function removeOwn(id: string): void {
  own = own.filter((n) => n.id !== id);
  save('intel-own', own);
  emit('intel', undefined);
}

/* Gelesen-Status ---------------------------------------------------- */
let seen = load<number>('intel-seen', 0) || Date.now() - 3 * DAY_MS;

export function lastSeen(): number {
  return seen;
}

export function markSeen(now: number): void {
  seen = Math.max(seen, now);
  save('intel-seen', seen);
  emit('intel', undefined);
}

export function unseenCount(now: number): number {
  return feed(now).filter((n) => !n.own && n.at > seen).length;
}

/* Spoiler-Schutz ---------------------------------------------------- */
let shield = load<boolean>('intel-shield', true);

export function spoilerShield(): boolean {
  return shield;
}

export function setSpoilerShield(v: boolean): void {
  shield = v;
  save('intel-shield', v);
  emit('intel', undefined);
}
