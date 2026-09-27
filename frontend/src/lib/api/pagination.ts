export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ListResult<T> = {
  items: T[];
  count: number;
  next: string | null;
  previous: string | null;
};

export function normalizeListResponse<T>(data: T[] | PaginatedResponse<T>): ListResult<T> {
  if (Array.isArray(data)) {
    return {
      items: data,
      count: data.length,
      next: null,
      previous: null,
    };
  }

  return {
    items: data.results,
    count: data.count,
    next: data.next,
    previous: data.previous,
  };
}
