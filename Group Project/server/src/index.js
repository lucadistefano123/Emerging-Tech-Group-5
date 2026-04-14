import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import typeDefs from "./graphql/typeDefs.js";
import resolvers from "./graphql/resolvers.js";
import { securityMiddleware } from "./middleware/securityMiddleware.js";
import { connectDB } from "./config/db.js";
import { formatError } from "./utils/errorHandler.js";

dotenv.config();

const app = express();
app.use(securityMiddleware);

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("CivicCase backend is running");
});

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

  const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError
});

    await server.start();

        app.use(
  "/graphql",
  expressMiddleware(server, {
    context: async ({ req, res }) => {
      return { req, res };
    }
  })
);

    app.listen(5000, () => {
      console.log("✅ Server running on http://localhost:5000");
    });
  } catch (error) {
    console.error("❌ Server startup error:", error.message);
  }
};

startServer();
await connectDB();