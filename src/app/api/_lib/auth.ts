import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { auth } from "@clerk/nextjs/server";

import { getClerkJwtTemplate } from "@/lib/env";

export type AuthTokenResult =
  | { token: string }
  | { error: string; status: number };

export type OptionalAuthTokenResult = { token?: string };

export async function requireAuthToken(): Promise<AuthTokenResult> {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return { error: "Unauthorized", status: 401 };
    }

    const template = getClerkJwtTemplate();
    const token = await getToken(template ? { template } : undefined);
    if (!token) {
      // Missing JWT usually means the template is misconfigured or not issued for this session.
      const hint = template
        ? `Configure Clerk JWT template "${template}" and ensure it issues tokens server-side.`
        : "Clerk could not issue a JWT for this session.";
      return { error: hint, status: 401 };
    }

    return { token };
  } catch (error) {
    if (isClerkAPIResponseError(error)) {
      // Clerk failed to resolve the session; normalize to unauthorized.
      return { error: "Unauthorized", status: 401 };
    }
    return { error: "Authentication failed", status: 500 };
  }
}

export async function getOptionalAuthToken(): Promise<OptionalAuthTokenResult> {
  try {
    const { userId, getToken } = await auth();
    if (!userId) return {};

    const template = getClerkJwtTemplate();
    const token = await getToken(template ? { template } : undefined);

    return token ? { token } : {};
  } catch (error) {
    if (isClerkAPIResponseError(error)) return {};
    return {};
  }
}
