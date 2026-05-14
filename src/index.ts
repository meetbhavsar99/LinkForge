import "dotenv/config";
import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { typeDefs } from "./graphql/schema";
import { resolvers } from "./graphql/resolvers";
import { prisma, verifySequences } from "./db/prisma";
import redirectRouter from "./routes/redirect";

async function bootstrap() {
  const app = express();
  const port = Number(process.env.PORT ?? 4000);

  const apollo = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
  });
  await apollo.start();

  // Order matters. Express matches in registration order.
  // 1. Specific paths first (/graphql, /health)
  // 2. Wildcard catch-all (/:code) LAST
  // If the order flipped, /:code matches "graphql" and "health" as short codes.

  app.use("/graphql", cors(), express.json(), expressMiddleware(apollo));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Redirect router mounted at root — must come AFTER specific routes.
  app.use("/", redirectRouter);

  await verifySequences();

  const server = app.listen(port, () => {
    console.log(`LinkForge API ready at http://localhost:${port}/graphql`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully`);
    server.close();
    await apollo.stop();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
