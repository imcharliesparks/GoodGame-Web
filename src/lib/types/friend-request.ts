import type { User } from "./user";

export type FriendRequestStatus = "PENDING" | "ACCEPTED" | "DENIED";

export type FriendRequest = {
  id: string;
  requesterId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: string | Date;
  updatedAt?: string | Date;
  requester?: User | null;
  receiver?: User | null;
};
