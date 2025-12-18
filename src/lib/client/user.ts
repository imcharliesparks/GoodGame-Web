"use client";

import { apiFetch } from "./api";
import type { User } from "@/lib/types/user";

export async function fetchCurrentUser() {
  return apiFetch<User>("/api/user/me");
}
