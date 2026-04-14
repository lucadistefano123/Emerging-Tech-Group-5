import rateLimit from "express-rate-limit";
import helmet from "helmet";

export const securityMiddleware = [
  helmet(),

  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again later."
  })
];