import { QueryClient } from '@tanstack/react-query';

// ─── Shared React Query client ────────────────────────────────────────────────
// Sane defaults so screens that adopt useQuery get caching + dedup automatically
// instead of refetching on every focus. Tuned for a mobile app talking to a
// possibly-cold backend.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30s: treat data as fresh, skip needless refetches
      gcTime: 5 * 60_000,       // keep cache 5 min after a screen unmounts
      retry: 2,                 // retry transient failures (cold start) twice
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default queryClient;
