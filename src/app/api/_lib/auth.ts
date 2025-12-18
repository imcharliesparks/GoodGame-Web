import { auth } from "@clerk/nextjs/server";

export type AuthTokenResult =
  | { token: string }
  | { error: string; status: number };

export async function requireAuthToken(): Promise<AuthTokenResult> {
  const { userId, getToken } = auth();
  if (!userId) {
    return { error: "Unauthorized", status: 401 };
  }

  const token = await getToken();
  if (!token) {
    return { error: "Unauthorized", status: 401 };
  }

  return { token };
}
