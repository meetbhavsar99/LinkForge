import "dotenv/config";
import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { typeDefs } from "./graphql/schema";
import { resolvers } from "./graphql/resolvers";
import { prisma, verifySequences } from "./db/prisma";

async function bootstrap() {
  const app = express();
  const port = Number(process.env.PORT ?? 4000);

  // Apollo Server v4 setup. The plugin pattern allows us to inject
  // request context (auth, etc.) per-request on Day 2.
  const apollo = new ApolloServer({
    typeDefs,
    resolvers,
    // Disabling introspection in prod is a common hardening step.
    // For dev/portfolio, we want it on so reviewers can explore the schema.
    introspection: true,
  });

  await apollo.start();

  app.use("/graphql", cors(), express.json(), expressMiddleware(apollo));

  // Health check. Production-grade APIs always have one. Used by
  // load balancers, Kubernetes, and uptime monitors.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  await verifySequences();

  const server = app.listen(port, () => {
    console.log(`LinkForge API ready at http://localhost:${port}/graphql`);
  });

  // Graceful shutdown. SIGTERM is what Docker/Kubernetes send when
  // stopping a container. Closing the HTTP server + Prisma client
  // ensures in-flight requests complete and DB connections are released.
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
