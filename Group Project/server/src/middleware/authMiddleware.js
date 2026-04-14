import jwt from "jsonwebtoken";

export const requireAuth = (req) => {
  try {
    let token;

    // ✅ 1. Check cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // ✅ 2. Fallback to header (for testing/Postman)
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      throw new Error("No token provided");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return decoded;
  } catch (error) {
    throw new Error("Unauthorized");
  }
};