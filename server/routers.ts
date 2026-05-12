import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createLeaderboardRecord, listLeaderboardRecords, normalizeLeaderboardLimit, sanitizePlayerLocation, sanitizePlayerName } from "./leaderboard";

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
          location: z.string().max(80).optional(),
        }),
      )
      .mutation(({ input }) =>
        createLeaderboardRecord({
          playerName: sanitizePlayerName(input.playerName),
          score: input.score,
          moves: input.moves,
          location: sanitizePlayerLocation(input.location),
        }),
      ),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
