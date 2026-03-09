"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appRouter = void 0;
const trpc_1 = require("./trpc");
exports.appRouter = (0, trpc_1.router)({
    hello: trpc_1.publicProcedure.query(() => {
        return { message: "tRPC is working 🚀" };
    }),
});
