import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import type { Express } from "express";
import { createGraphqlContext } from "./context";
import { resolvers } from "./resolvers";
import { typeDefs } from "./schema";

export async function mountGraphql(app: Express) {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await apolloServer.start();

  app.use(
    "/graphql",
    expressMiddleware(apolloServer, {
      context: async ({ req }) => createGraphqlContext(req),
    }),
  );
}
