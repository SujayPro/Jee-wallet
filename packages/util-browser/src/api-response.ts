export type ApiErrorResult = {
  error: {
    message: string;
    stack: string;
  };
};

export const isApiError = (res: unknown): res is ApiErrorResult =>
  res != null && typeof res === 'object' && 'error' in res;
