import { argusRequestJson } from "@/lib/argus/http";
import type { User } from "@/lib/types/user";

export type ArgusCallOptions = {
  token?: string;
};

export async function getCurrentUser(options: ArgusCallOptions = {}) {
  return argusRequestJson<User>({
    path: "/api/user/me",
    token: options.token,
  });
}
