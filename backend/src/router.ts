import { router, publicProcedure } from "./trpc";
import { prisma } from "./prisma";
import { z } from "zod";

export const appRouter = router({
  hello: publicProcedure.query(() => {
    return { message: "tRPC is working 🚀" };
  }),
});

export type AppRouter = typeof appRouter;