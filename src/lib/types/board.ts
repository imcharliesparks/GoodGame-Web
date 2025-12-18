export type Board = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  order: number;
  isPublic: boolean;
  createdAt: string | Date;
};
