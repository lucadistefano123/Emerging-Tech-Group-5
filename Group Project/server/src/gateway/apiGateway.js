// API Gateway - Central Request Validation & Security Layer

import { v4 as uuidv4 } from "uuid";
import validator from "validator";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// REQUEST ID MIDDLEWARE - for tracking requests
export const requestIdMiddleware = (req, res, next) => {
  req.id = req.headers["x-request-id"] || uuidv4();
  res.setHeader("X-Request-ID", req.id);
  next();
};

// SECURITY HEADERS - Helmet configuration
export const securityHeadersMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin"
  },
  noSniff: true,
  xssFilter: true,
  frameguard: {
    action: "deny"
  }
});

// INPUT SANITIZATION MIDDLEWARE
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return validator.trim(validator.escape(obj));
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === "object") {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
};

export const inputSanitizationMiddleware = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  next();
};

// PAYLOAD SIZE LIMIT MIDDLEWARE
export const payloadSizeMiddleware = (req, res, next) => {
  const contentLength = req.headers["content-length"];

  if (contentLength) {
    const sizeInMB = contentLength / (1024 * 1024);
    if (sizeInMB > 10) {
      return res.status(413).json({
        error: "Payload too large",
        message: "Request body exceeds 10MB limit",
        requestId: req.id
      });
    }
  }

  next();
};

// RATE LIMITING BY ENDPOINT
export const createEndpointRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: "Too many requests from this account/IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return req.path === "/health" || req.path === "/status";
    },
    handler: (req, res) => {
      res.status(429).json({
        error: "Rate limit exceeded",
        message: "Too many requests from this IP/account",
        retryAfter: req.rateLimit?.resetTime,
        requestId: req.id
      });
    }
  });
};

// Specific rate limiters for different endpoints
export const graphqlRateLimiter = createEndpointRateLimiter(
  15 * 60 * 1000, // 15 minutes
  50 // 50 requests per window
);

export const authRateLimiter = createEndpointRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10 // 10 auth attempts per window
);

export const apiRateLimiter = createEndpointRateLimiter(
  60 * 1000, // 1 minute
  30 // 30 requests per minute
);

// REQUEST VALIDATION MIDDLEWARE
export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const data = {
        body: req.body || {},
        query: req.query || {},
        params: req.params || {}
      };

      if (schema.body) {
        for (const key in schema.body) {
          if (schema.body[key].required && !req.body?.[key]) {
            return res.status(400).json({
              error: "Validation error",
              message: `Missing required field: ${key}`,
              requestId: req.id
            });
          }

          if (req.body?.[key]) {
            const expectedType = schema.body[key].type;
            const actualType = typeof req.body[key];

            if (expectedType && actualType !== expectedType) {
              return res.status(400).json({
                error: "Validation error",
                message: `Field '${key}' must be of type ${expectedType}`,
                requestId: req.id
              });
            }
          }
        }
      }

      next();
    } catch (error) {
      res.status(400).json({
        error: "Request validation failed",
        message: error.message,
        requestId: req.id
      });
    }
  };
};

// REQUEST TIMEOUT MIDDLEWARE
export const requestTimeoutMiddleware = (timeout = 30000) => {
  return (req, res, next) => {
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: "Request timeout",
          message: `Request exceeded ${timeout}ms timeout limit`,
          requestId: req.id
        });
      }
    }, timeout);

    res.on("finish", () => clearTimeout(timeoutId));
    res.on("close", () => clearTimeout(timeoutId));

    next();
  };
};

// LOGGING MIDDLEWARE
export const loggingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    const duration = Date.now() - startTime;
    const logData = {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      userId: req.user?.id || "anonymous"
    };

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[${logData.statusCode}] ${logData.method} ${logData.path} - ${logData.duration}`
      );
    }

    return originalJson(data);
  };

  next();
};

// ERROR HANDLING MIDDLEWARE
export const errorHandlingMiddleware = (err, req, res, next) => {
  console.error(`[ERROR] RequestID: ${req.id} - ${err.message}`);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation failed",
      message: err.message,
      requestId: req.id
    });
  }

  if (err.name === "AuthenticationError" || err.message === "Unauthorized") {
    return res.status(401).json({
      error: "Authentication failed",
      message: "Invalid or expired token",
      requestId: req.id
    });
  }

  if (err.name === "AuthorizationError" || err.message === "Forbidden") {
    return res.status(403).json({
      error: "Authorization failed",
      message: "You do not have permission to access this resource",
      requestId: req.id
    });
  }

  res.status(err.status || 500).json({
    error: err.name || "Internal server error",
    message: err.message || "An unexpected error occurred",
    requestId: req.id,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
};

// API VERSIONING MIDDLEWARE
export const apiVersioning = (req, res, next) => {
  req.apiVersion = req.headers["x-api-version"] || "v1";

  const deprecatedVersions = ["v0"];
  if (deprecatedVersions.includes(req.apiVersion)) {
    res.setHeader("X-API-Warn", "This API version is deprecated");
  }

  next();
};

// CORS WITH SAFE DEFAULTS
export const corsConfig = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID", "X-API-Version"],
  exposedHeaders: ["X-Request-ID", "X-API-Version", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
  maxAge: 86400
};

// HEALTH CHECK ENDPOINT
export const healthCheckEndpoint = (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    requestId: req.id
  });
};

// METRICS AND STATISTICS
let requestStats = {
  totalRequests: 0,
  errorRequests: 0,
  startTime: Date.now()
};

export const metricsMiddleware = (req, res, next) => {
  requestStats.totalRequests++;

  res.on("finish", () => {
    if (res.statusCode >= 400) {
      requestStats.errorRequests++;
    }
  });

  next();
};

export const metricsEndpoint = (req, res) => {
  const uptime = Date.now() - requestStats.startTime;
  const errorRate = ((requestStats.errorRequests / requestStats.totalRequests) * 100).toFixed(2);

  res.status(200).json({
    requestId: req.id,
    metrics: {
      totalRequests: requestStats.totalRequests,
      errorRequests: requestStats.errorRequests,
      errorRate: `${errorRate}%`,
      uptime: `${(uptime / 1000).toFixed(2)}s`
    }
  });
};

// GEMINI API REQUEST INTERCEPTOR
export const createGeminiRequestInterceptor = () => {
  return async (req, res, next) => {
    const originalFetch = global.fetch;

    // Intercept fetch calls to Gemini API
    global.fetch = async (...args) => {
      const [url, options] = args;
      const requestUrl = typeof url === "string" ? url : url.toString();

      if (requestUrl.includes("generativelanguage.googleapis.com")) {
        // Add request ID to Gemini requests
        if (!options.headers) options.headers = {};
        options.headers["X-Request-ID"] = req.id;

        // Log API call
        console.log(
          `[GEMINI-API] ${options.method || "GET"} ${requestUrl.split("?")[0]}`
        );

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        options.signal = controller.signal;

        try {
          const response = await originalFetch.apply(global, args);
          clearTimeout(timeout);

          if (!response.ok) {
            console.error(
              `[GEMINI-ERROR] Status ${response.status}: ${response.statusText}`
            );
          }

          return response;
        } catch (error) {
          clearTimeout(timeout);
          console.error(`[GEMINI-ERROR] ${error.message}`);
          throw error;
        }
      }

      return originalFetch.apply(global, args);
    };

    next();
  };
};

export default {
  requestIdMiddleware,
  securityHeadersMiddleware,
  inputSanitizationMiddleware,
  payloadSizeMiddleware,
  createEndpointRateLimiter,
  graphqlRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  validateRequest,
  requestTimeoutMiddleware,
  loggingMiddleware,
  errorHandlingMiddleware,
  apiVersioning,
  corsConfig,
  healthCheckEndpoint,
  metricsEndpoint,
  metricsMiddleware,
  createGeminiRequestInterceptor
};
