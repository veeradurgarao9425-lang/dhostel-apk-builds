/**
 * apiCache.ts — Lightweight in-memory cache for React Native (no external deps)
 *
 * Usage:
 *   const data = await cachedGet('/students', 30_000); // 30s TTL
 *   invalidateCache('/students');  // force refetch next time
 *   invalidateCachePrefix('/students'); // invalidate all keys starting with /students
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';

interface CacheEntry<T = any> {
  data: T;
  fetchedAt: number;
  ttl: number; // ms
}

const cache = new Map<string, CacheEntry>();

/**
 * Returns cached data if fresh, otherwise fetches from API and caches the result.
 * @param url       API path (relative, e.g. '/students')
 * @param ttlMs     Cache TTL in milliseconds (default: 60_000 = 60s)
 * @param fetcher   Optional async function to fetch — defaults to `api.get(url).data`
 */
export async function cachedGet<T = any>(
  url: string,
  ttlMs = 60_000,
  fetcher?: () => Promise<T>,
): Promise<T> {
  const existing = cache.get(url);
  if (existing && Date.now() - existing.fetchedAt < existing.ttl) {
    return existing.data as T;
  }
  const result: T = fetcher
    ? await fetcher()
    : (await api.get<T>(url)).data;

  cache.set(url, { data: result, fetchedAt: Date.now(), ttl: ttlMs });
  return result;
}

/** Remove a single key so the next call re-fetches from the server. */
export function invalidateCache(url: string) {
  cache.delete(url);
}

/** Remove all keys that start with the given prefix. */
export function invalidateCachePrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/** Clear the entire cache (e.g. on logout). */
export function clearAllCache() {
  cache.clear();
}

/**
 * useCachedFetch — hook that wraps cachedGet with loading/error state.
 *
 * Example:
 *   const { data, loading, error, refresh } = useCachedFetch('/students', 30_000);
 */
export function useCachedFetch<T = any>(
  url: string | null,
  ttlMs = 60_000,
  options?: {
    transform?: (raw: any) => T;
    enabled?: boolean;
  },
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const doFetch = useCallback(async (force = false) => {
    if (!url || options?.enabled === false) return;
    setLoading(true);
    setError(null);
    try {
      if (force) invalidateCache(url);
      const result = await cachedGet<T>(url, ttlMs);
      if (!mountedRef.current) return;
      setData(options?.transform ? options.transform(result) : result);
    } catch (e: any) {
      if (!mountedRef.current) return;
      setError(e?.response?.data?.error || e?.message || 'Request failed');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [url, ttlMs, options?.enabled]);

  useEffect(() => {
    mountedRef.current = true;
    doFetch();
    return () => { mountedRef.current = false; };
  }, [doFetch]);

  return { data, loading, error, refresh: () => doFetch(true) };
}
