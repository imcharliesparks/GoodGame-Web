import { auth } from "@clerk/nextjs/server";

import { getClerkJwtTemplate } from "@/lib/env";

export type AuthTokenResult =
  | { token: string }
  | { error: string; status: number };

export type OptionalAuthTokenResult = { token?: string };

export async function requireAuthToken(): Promise<AuthTokenResult> {
  const { userId, getToken } = auth();
  if (!userId) {
    return { error: "Unauthorized", status: 401 };
  }

  const template = getClerkJwtTemplate();
  const token = await getToken(template ? { template } : undefined);
  if (!token) {
    return { error: "Unauthorized", status: 401 };
  }

  return { token };
}

export async function getOptionalAuthToken(): Promise<OptionalAuthTokenResult> {
  const { userId, getToken } = auth();
  if (!userId) return {};

  const template = getClerkJwtTemplate();
  const token = await getToken(template ? { template } : undefined);

  return token ? { token } : {};
}
