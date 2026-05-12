import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createLeaderboardRecord, listLeaderboardRecords, normalizeLeaderboardLimit, sanitizePlayerName } from "./leaderboard";

/** Resolve city+country from a client IP using ip-api.com (free, no key required). */
async function resolveLocationFromIp(ip: string): Promise<string> {
  try {
    // ip-api.com returns JSON with city and country fields
    const resp = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,country`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return "Unknown";
    const data = await resp.json() as { status: string; city?: string; country?: string };
    if (data.status !== "success") return "Unknown";
    const parts = [data.city, data.country].filter(Boolean);
    return parts.join(", ") || "Unknown";
  } catch {
    return "Unknown";
  }
}

/** Extract the real client IP from the request, respecting common proxy headers. */
function getClientIp(req: import("express").Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress ?? "";
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  leaderboard: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(5).optional() }).optional())
      .query(({ input }) => listLeaderboardRecords(normalizeLeaderboardLimit(input?.limit))),
    submit: publicProcedure
      .input(
        z.object({
          playerName: z.string().min(1).max(80),
          score: z.number().int().min(1).max(1_000_000),
          moves: z.number().int().min(0).max(10_000),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const ip = getClientIp(ctx.req);
        const location = await resolveLocationFromIp(ip);
        return createLeaderboardRecord({
          playerName: sanitizePlayerName(input.playerName),
          score: input.score,
          moves: input.moves,
          location,
        });
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
