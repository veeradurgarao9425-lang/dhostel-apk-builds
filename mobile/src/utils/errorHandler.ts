// ─── API Error Handler ────────────────────────────────────────────────────────
// Converts raw API errors into human-readable messages.
// Use this everywhere instead of error.message or error.response?.data?.error

export function parseApiError(error: any): string {
  // Server returned a friendly specific message — always prioritize this
  const serverMsg = error?.response?.data?.error || error?.response?.data?.message;
  if (serverMsg && typeof serverMsg === 'string' && serverMsg.length < 200) {
    return serverMsg;
  }

  const status = error?.response?.status;

  if (status === 401) return 'Session expired. Please log in again.';
  if (status === 403) return "You don't have permission to do this.";
  if (status === 404) return 'Not found. It may have been deleted.';
  if (status === 422) return 'Please check your inputs and try again.';
  if (status === 429) return 'Too many requests. Please slow down.';
  if (status && status >= 500) return 'Server error. Please try again in a moment.';

  // Network / offline
  if (
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ERR_NETWORK' ||
    error?.message === 'Network Error'
  ) {
    return 'Network Error: Please check your internet connection and server status.';
  }

  // Axios timeout
  if (error?.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }

  return error?.message || 'Something went wrong. Please try again.';
}

/**
 * Returns true if the error is due to network being offline
 */
export function isNetworkError(error: any): boolean {
  return (
    error?.code === 'ERR_NETWORK' ||
    error?.message === 'Network Error' ||
    !error?.response
  );
}
