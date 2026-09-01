export interface ApiResponse<T = any> {
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
  path?: string;
  timestamp?: string;
  validationErrors?: Record<string, string>;
}
