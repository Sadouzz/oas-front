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
 * que le paramètre soit :
 * - un ApiResponse<{ content: [...] }> ({ data: { content: [...] } })
 * - un ApiResponse<T[]> ({ data: [...] })
 * - un PageResponse<T> ({ content: [...] })
 * - directement un tableau T[].
 */
export function extractContent<T>(res: PageResponse<T> | ApiResponse<PageResponse<T>> | ApiResponse<T[]> | T[] | null | undefined): T[];
export function extractContent<T = any>(res: any): T[];
export function extractContent<T>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === 'object') {
    if ('data' in res && res.data !== undefined) {
      return extractContent<T>(res.data);
    }
    if ('content' in res && Array.isArray(res.content)) {
      return res.content;
    }
  }
  return [];
}

export function extractPage<T>(res: PageResponse<T> | ApiResponse<PageResponse<T>> | null | undefined): PageResponse<T> | null;
export function extractPage<T = any>(res: any): PageResponse<T> | null;
export function extractPage<T>(res: any): PageResponse<T> | null {
  if (!res) return null;
  if (typeof res === 'object') {
    if ('data' in res && res.data !== undefined && typeof res.data === 'object' && 'content' in res.data) {
      return res.data as PageResponse<T>;
    }
    if ('content' in res && Array.isArray(res.content)) {
      return res as PageResponse<T>;
    }
  }
  return null;
}
