"use client";

import { apiFetch } from "./api";
import type { HealthStatus } from "@/lib/types/health";

export async function fetchHealthStatus() {
  return apiFetch<HealthStatus>("/api/health");
}
