import { createMiddleware } from "hono/factory";
import { validateToken } from "@/libs/jwt";
import db from "@/libs/db";

/**
 * Auth middleware that validates a JWT token in the Authorization header
 *
 * If the token is invalid or missing, a 401 response is returned.
 *
 * If the token is valid, the user ID is extracted and used to find the user in
 * the database. If the user is not found, a 404 response is returned.
 *
 * If the user is found, the user object is stored in the request context and the
 * next middleware is called.
 *
 * If the token is invalid for any other reason, a 401 response is returned with
 * a generic error message.
 */
const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return c.json({ message: "Authorization token is required!" }, 401);
  }

  try {
    const decodedToken = await validateToken(token);
    if (!decodedToken || !decodedToken.subject) {
      throw new Error("Invalid or expired access token!");
    }

    const userId = decodedToken?.subject;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return c.json({ message: "User not found!" }, 404);
    }

    c.set("user", user);

    await next();
  } catch (error: Error | any) {
    return c.json({ message: error.message || "Unauthorized!" }, 401);
  }
});

export default authMiddleware;
