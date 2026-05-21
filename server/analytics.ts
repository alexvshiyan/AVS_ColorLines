import { and, count, desc, gte, sql } from "drizzle-orm";
import type { IncomingMessage } from "http";
import { analyticsEvents, playerSessions, type InsertAnalyticsEvent } from "../drizzle/schema";
import { getDb } from "./db";

export const ANALYTICS_SESSION_ID_MAX_LENGTH = 64;
export const ANALYTICS_EVENT_NAME_MAX_LENGTH = 80;
export const ANALYTICS_CATEGORY_MAX_LENGTH = 40;
export const ANALYTICS_PAGE_MAX_LENGTH = 120;
export const ANALYTICS_METADATA_MAX_LENGTH = 4_000;
export const ONLINE_WINDOW_SECONDS = 180;

export type TrackAnalyticsEventInput = {
  sessionId: string;
  eventName: string;
  category?: string;
  page?: string;
  metadata?: Record<string, unknown>;
  locale?: string;
  timezone?: string;
  viewport?: string;
  displayMode?: string;
  browser?: string;
  platform?: string;
};

export type AnalyticsClientContext = Pick<
  TrackAnalyticsEventInput,
  "locale" | "timezone" | "viewport" | "displayMode" | "browser" | "platform"
>;

function sanitizeText(value: string | undefined, maxLength: number, fallback = ""): string {
  const cleaned = (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  const limited = Array.from(cleaned).slice(0, maxLength).join("");
  return limited || fallback;
}

function sanitizeNullableText(value: string | undefined, maxLength: number): string | null {
  const cleaned = sanitizeText(value, maxLength);
  return cleaned || null;
}

function sanitizeSessionId(sessionId: string): string {
  const normalized = sessionId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, ANALYTICS_SESSION_ID_MAX_LENGTH);
  return normalized || "anonymous";
}

function sanitizeMetadata(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null;

  try {
    const json = JSON.stringify(metadata, (_key, value) => {
      if (typeof value === "function" || typeof value === "symbol") return undefined;
      if (typeof value === "string") return Array.from(value).slice(0, 500).join("");
      return value;
    });
    return json.length > ANALYTICS_METADATA_MAX_LENGTH ? json.slice(0, ANALYTICS_METADATA_MAX_LENGTH) : json;
  } catch (_error) {
    return null;
  }
}

function firstHeader(req: IncomingMessage | undefined, names: string[]): string | undefined {
  if (!req) return undefined;
  for (const name of names) {
    const value = req.headers[name.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function inferLocation(req: IncomingMessage | undefined): string {
  const city = sanitizeNullableText(firstHeader(req, ["x-vercel-ip-city", "cf-ipcity", "x-forwarded-city"]), 40);
  const country = sanitizeNullableText(firstHeader(req, ["x-vercel-ip-country", "cf-ipcountry", "x-country-code"]), 20);

  if (city && country) return `${city}, ${country}`;
  if (country) return country;
  return "Unknown";
}

function inferUserAgent(req: IncomingMessage | undefined): string | null {
  return sanitizeNullableText(firstHeader(req, ["user-agent"]), 500);
}

function inferBrowserFromUserAgent(userAgent: string | null): string | null {
  const ua = userAgent ?? "";
  if (/Edg\//.test(ua)) return "Microsoft Edge";
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/OPR\//.test(ua)) return "Opera";
  return null;
}

function inferPlatformFromUserAgent(userAgent: string | null): string | null {
  const ua = userAgent ?? "";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return null;
}

export async function trackAnalyticsEvent(
  input: TrackAnalyticsEventInput,
  options: { userId?: number | null; req?: IncomingMessage | undefined } = {},
): Promise<{ ok: true; onlinePlayers: number }> {
  const db = await getDb();
  if (!db) {
    return { ok: true, onlinePlayers: 0 };
  }

  const userAgent = inferUserAgent(options.req);
  const browser = sanitizeNullableText(input.browser, 80) ?? inferBrowserFromUserAgent(userAgent);
  const platform = sanitizeNullableText(input.platform, 80) ?? inferPlatformFromUserAgent(userAgent);
  const location = inferLocation(options.req);
  const sessionId = sanitizeSessionId(input.sessionId);
  const eventName = sanitizeText(input.eventName, ANALYTICS_EVENT_NAME_MAX_LENGTH, "unknown_event");
  const category = sanitizeText(input.category, ANALYTICS_CATEGORY_MAX_LENGTH, "game");
  const page = sanitizeText(input.page, ANALYTICS_PAGE_MAX_LENGTH, "/");

  const values: InsertAnalyticsEvent = {
    sessionId,
    userId: options.userId ?? null,
    eventName,
    category,
    page,
    metadata: sanitizeMetadata(input.metadata),
    locale: sanitizeNullableText(input.locale, 32),
    timezone: sanitizeNullableText(input.timezone, 64),
    viewport: sanitizeNullableText(input.viewport, 32),
    displayMode: sanitizeNullableText(input.displayMode, 32),
    userAgent,
    browser,
    platform,
    location,
  };

  await db.insert(analyticsEvents).values(values);
  await db
    .insert(playerSessions)
    .values({
      sessionId,
      userId: options.userId ?? null,
      eventCount: 1,
      lastEventName: eventName,
      locale: values.locale,
      timezone: values.timezone,
      viewport: values.viewport,
      displayMode: values.displayMode,
      userAgent,
      browser,
      platform,
      location,
    })
    .onDuplicateKeyUpdate({
      set: {
        userId: options.userId ?? null,
        eventCount: sql`${playerSessions.eventCount} + 1`,
        lastEventName: eventName,
        locale: values.locale,
        timezone: values.timezone,
        viewport: values.viewport,
        displayMode: values.displayMode,
        userAgent,
        browser,
        platform,
        location,
        lastSeenAt: new Date(),
      },
    });

  return { ok: true, onlinePlayers: await getOnlinePlayersCount() };
}

export async function getOnlinePlayersCount(windowSeconds = ONLINE_WINDOW_SECONDS): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const since = new Date(Date.now() - Math.max(30, windowSeconds) * 1000);
  const [row] = await db
    .select({ total: count() })
    .from(playerSessions)
    .where(gte(playerSessions.lastSeenAt, since));

  return Number(row?.total ?? 0);
}

export async function getAnalyticsOverview(days = 14) {
  const db = await getDb();
  if (!db) {
    return {
      totals: { events: 0, sessions: 0, onlinePlayers: 0 },
      topEvents: [],
      topBrowsers: [],
      topPlatforms: [],
      topLocations: [],
      recentEvents: [],
      dailyEvents: [],
    };
  }

  const since = new Date(Date.now() - Math.max(1, Math.min(days, 90)) * 24 * 60 * 60 * 1000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [eventsTotal] = await db.select({ total: count() }).from(analyticsEvents).where(gte(analyticsEvents.createdAt, since));
  const [sessionsTotal] = await db.select({ total: count() }).from(playerSessions).where(gte(playerSessions.lastSeenAt, since));

  const topEvents = await db
    .select({ name: analyticsEvents.eventName, total: count() })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, since))
    .groupBy(analyticsEvents.eventName)
    .orderBy(desc(sql`count(*)`))
    .limit(12);

  const topBrowsers = await db
    .select({ name: analyticsEvents.browser, total: count() })
    .from(analyticsEvents)
    .where(and(gte(analyticsEvents.createdAt, since), sql`${analyticsEvents.browser} is not null`))
    .groupBy(analyticsEvents.browser)
    .orderBy(desc(sql`count(*)`))
    .limit(8);

  const topPlatforms = await db
    .select({ name: analyticsEvents.platform, total: count() })
    .from(analyticsEvents)
    .where(and(gte(analyticsEvents.createdAt, since), sql`${analyticsEvents.platform} is not null`))
    .groupBy(analyticsEvents.platform)
    .orderBy(desc(sql`count(*)`))
    .limit(8);

  const topLocations = await db
    .select({ name: analyticsEvents.location, total: count() })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, since))
    .groupBy(analyticsEvents.location)
    .orderBy(desc(sql`count(*)`))
    .limit(8);

  const recentEvents = await db
    .select({
      eventName: analyticsEvents.eventName,
      category: analyticsEvents.category,
      sessionId: analyticsEvents.sessionId,
      location: analyticsEvents.location,
      browser: analyticsEvents.browser,
      platform: analyticsEvents.platform,
      createdAt: analyticsEvents.createdAt,
    })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, since))
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(30);

  const dailyEvents = await db
    .select({ day: sql<string>`date(${analyticsEvents.createdAt})`, total: count() })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, since))
    .groupBy(sql`date(${analyticsEvents.createdAt})`)
    .orderBy(sql`date(${analyticsEvents.createdAt})`)
    .limit(90);

  return {
    totals: {
      events: Number(eventsTotal?.total ?? 0),
      sessions: Number(sessionsTotal?.total ?? 0),
      onlinePlayers: await getOnlinePlayersCount(),
    },
    topEvents,
    topBrowsers,
    topPlatforms,
    topLocations,
    recentEvents,
    dailyEvents,
  };
}

export async function listRecentSessions(limit = 30) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      sessionId: playerSessions.sessionId,
      userId: playerSessions.userId,
      eventCount: playerSessions.eventCount,
      lastEventName: playerSessions.lastEventName,
      location: playerSessions.location,
      browser: playerSessions.browser,
      platform: playerSessions.platform,
      displayMode: playerSessions.displayMode,
      startedAt: playerSessions.startedAt,
      lastSeenAt: playerSessions.lastSeenAt,
    })
    .from(playerSessions)
    .orderBy(desc(playerSessions.lastSeenAt))
    .limit(Math.max(1, Math.min(limit, 100)));
}
