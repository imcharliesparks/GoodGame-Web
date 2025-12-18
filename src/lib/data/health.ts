import { argusRequestJson } from "@/lib/argus/http";
import type { HealthStatus } from "@/lib/types/health";

export async function fetchHealth() {
  return argusRequestJson<HealthStatus>({
    path: "/health",
    cache: "no-store",
  });
}
