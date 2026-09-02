export interface ApiResponse<T> {
  status: number;
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

export interface ErrorResponse {
  status: number;
  error: string;
  message: string;
  path: string;
  timestamp?: string;
  validationErrors?: Record<string, string>;
}

export interface PageResponse<T> {
  content: T[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isFirst?: boolean;
  isLast?: boolean;
  first?: boolean;
  last?: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  pages: number[];
}

/**
 * Helper d'extraction universel : renvoie toujours le tableau d'éléments T[],
 * que le paramètre soit un PageResponse<T> ({ content: [...] }) ou directement un tableau T[].
 */
export function extractContent<T>(res: PageResponse<T> | T[] | null | undefined): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object' && 'content' in res && Array.isArray((res as any).content)) {
    return (res as any).content;
  }
  return [];
}
