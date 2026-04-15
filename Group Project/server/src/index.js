import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import typeDefs from "./graphql/typeDefs.js";
import resolvers from "./graphql/resolvers.js";
import { connectDB } from "./config/db.js";

const app = express();

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    const server = new ApolloServer({
      typeDefs,
      resolvers,
      formatError: (err) => {
        console.error("GraphQL Error:", err);
        return {
          message: err.message,
          code: err.extensions?.code,
        };
      },
    });

    await server.start();

    app.use(
      "/graphql",
      expressMiddleware(server, {
        context: async ({ req, res }) => ({ req, res }),
      }),
    );

    // ✅ ИСПРАВЛЕНО: Используем переменную окружения
    const PORT = process.env.PORT || 4000;

    app.listen(PORT, () => {
      console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    console.error("❌ Server startup error:", error.message);
    process.exit(1);
  }
};

startServer();
