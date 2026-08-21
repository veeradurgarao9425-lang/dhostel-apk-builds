// ─── API Error Handler ────────────────────────────────────────────────────────
// Converts raw API errors into human-readable messages.
// Use this everywhere instead of error.message or error.response?.data?.error

export function parseApiError(error: any): string {
  // Server returned a friendly specific message — always prioritize this
  const serverMsg = error?.response?.data?.error || error?.response?.data?.message;
  if (serverMsg && typeof serverMsg === 'string' && serverMsg.length < 250) {
    return serverMsg;
  }

  const status = error?.response?.status;

  if (status === 401) return 'Session expired. Please log in again.';
  if (status === 403) return "You don't have permission to perform this action.";
  if (status === 404) return 'The requested item was not found.';
  if (status === 409) return serverMsg || 'A record with these details already exists.';
  if (status === 413) return 'The uploaded image or file is too large. Please select a smaller photo.';
  if (status === 422) return 'Please check your input fields and try again.';
  if (status === 429) return 'Too many requests. Please slow down and try again in a few moments.';
  if (status && status >= 500) return 'Server is currently busy. Please try again in a moment.';

  // Axios timeout
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'Upload timed out. Please check your internet connection or use smaller photos.';
  }

  // Network / offline
  if (
    error?.code === 'ERR_NETWORK' ||
    error?.message === 'Network Error' ||
    !error?.response
  ) {
    return 'Unable to reach server. Please check your internet connection and try again.';
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
