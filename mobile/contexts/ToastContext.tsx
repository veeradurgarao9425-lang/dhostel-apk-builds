import React, { createContext, useContext, useCallback } from 'react';
import Toast from 'react-native-toast-message';

// ─── Types ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ShowToastParams {
  type: ToastType;
  message: string;
  title?: string;
  duration?: number; // ms; defaults: success/info=3000, error=6000
}

interface ToastContextValue {
  showToast: (params: ShowToastParams) => void;
  showApiError: (error: any, fallback?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  showApiError: () => {},
  showSuccess: () => {},
  showError: () => {},
  showWarning: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const showToast = useCallback(({ type, message, title, duration }: ShowToastParams) => {
    const defaultDuration = (type === 'error') ? 6000 : 3000;
    const titleMap: Record<ToastType, string> = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info',
    };

    Toast.show({
      type,
      text1: title ?? titleMap[type],
      text2: message,
      visibilityTime: duration ?? defaultDuration,
      autoHide: true,
      position: 'top',
      topOffset: 50,
    });
  }, []);

  const showApiError = useCallback((error: any, fallback?: string) => {
    let message = fallback || 'Something went wrong.';
    if (error?.response?.data?.message) {
      message = error.response.data.message;
    } else if (error?.message) {
      message = error.message;
    }
    showToast({ type: 'error', message });
  }, [showToast]);

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', message, title });
  }, [showToast]);

  const showError = useCallback((message: string, title?: string) => {
    showToast({ type: 'error', message, title });
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string) => {
    showToast({ type: 'warning', message, title });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showApiError, showSuccess, showError, showWarning }}>
      {children}
    </ToastContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useToast = () => useContext(ToastContext);

export default ToastContext;
