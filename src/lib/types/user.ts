export type User = {
  id: string;
  email: string;
  username?: string;
  name?: string;
  avatarUrl?: string;
  createdAt: string | Date;
  publicMetadata?: {
    location?: string;
    [key: string]: unknown;
  };
};
