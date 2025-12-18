import { clerkMiddleware } from "@clerk/nextjs/server";

// Use default Clerk middleware to hydrate auth() for route handlers.
export default clerkMiddleware();

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/api/(.*)"],
};
