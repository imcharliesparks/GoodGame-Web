export type ApiResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type PaginatedResult<T> = {
  items: T[];
  nextCursor?: string;
};
