"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string | null;
}

// In-memory runtime cache for 0ms transitions within the current session
const memoryCache = new Map<string, CacheEntry<any>>();

// In-flight request deduplication map
const pendingRequests = new Map<string, Promise<any>>();

const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Reads from in-memory cache first, falls back to sessionStorage for tab persistence.
 */
function readCache<T>(key: string, ttlMs: number): T | null {
  const now = Date.now();
  const mem = memoryCache.get(key);
  if (mem && now - mem.timestamp < ttlMs) {
    return mem.data as T;
  }

  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`mirai_cache_${key}`);
      if (stored) {
        const parsed: CacheEntry<T> = JSON.parse(stored);
        if (now - parsed.timestamp < ttlMs) {
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {
      // Ignore sessionStorage parsing or quota errors
    }
  }

  return null;
}

/**
 * Writes data to memory cache and sessionStorage.
 */
function writeCache<T>(key: string, data: T) {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };
  memoryCache.set(key, entry);

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`mirai_cache_${key}`, JSON.stringify(entry));
    } catch {
      // Ignore quota errors
    }
  }
}

/**
 * Invalidates cache by exact key or prefix pattern.
 * Call this after creating, editing, or deleting items to ensure next fetch is fresh.
 */
export function invalidateCache(urlPattern?: string) {
  if (!urlPattern) {
    memoryCache.clear();
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith("mirai_cache_")) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch {}
    }
    return;
  }

  for (const k of memoryCache.keys()) {
    if (k.includes(urlPattern)) {
      memoryCache.delete(k);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith("mirai_cache_") && k.includes(urlPattern)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {}
  }
}

/**
 * Fetches data with in-flight request deduplication and caching.
 */
export async function cachedFetch<T>(
  url: string,
  options?: {
    ttlMs?: number;
    forceRefresh?: boolean;
    fetchOptions?: RequestInit;
  }
): Promise<T> {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;

  if (!options?.forceRefresh) {
    const cached = readCache<T>(url, ttlMs);
    if (cached !== null) {
      return cached;
    }
  }

  // Deduplicate concurrent requests to the same URL
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const res = await fetch(url, options?.fetchOptions);
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = (await res.json()) as T;
      writeCache(url, data);
      return data;
    } finally {
      pendingRequests.delete(url);
    }
  })();

  pendingRequests.set(url, promise);
  return promise;
}

/**
 * React Hook for zero-latency Stale-While-Revalidate (SWR) data fetching.
 * If data is already cached, renders immediately (loading = false, 0ms delay).
 * Revalidates in the background without flickering skeleton loaders.
 */
export function useCachedData<T>(
  url: string | null,
  options?: {
    ttlMs?: number;
    initialData?: T;
    enabled?: boolean;
  }
) {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const enabled = options?.enabled !== false && Boolean(url);

  const initialCached = url && enabled ? readCache<T>(url, ttlMs) : null;
  const [data, setData] = useState<T | null>(initialCached || options?.initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialCached && Boolean(url));
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const revalidate = useCallback(
    async (force = false) => {
      if (!url || !enabled) return;

      const cached = !force ? readCache<T>(url, ttlMs) : null;
      if (cached !== null && !force) {
        setData(cached);
        setLoading(false);
        return;
      }

      setIsRevalidating(true);
      try {
        const fresh = await cachedFetch<T>(url, {
          ttlMs,
          forceRefresh: force,
        });
        if (isMountedRef.current) {
          setData(fresh);
          setError(null);
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err.message || "Failed to load data");
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setIsRevalidating(false);
        }
      }
    },
    [url, ttlMs, enabled]
  );

  useEffect(() => {
    if (!url || !enabled) return;

    const cached = readCache<T>(url, ttlMs);
    if (cached) {
      setData(cached);
      setLoading(false);
      // Quiet background revalidation if near expiration
      revalidate(false);
    } else {
      setLoading(true);
      revalidate(true);
    }
  }, [url, enabled, ttlMs, revalidate]);

  // Optimistic local state update
  const mutate = useCallback(
    (newData: T | ((prev: T | null) => T | null), shouldPersistCache = true) => {
      setData((prev) => {
        const resolved = typeof newData === "function" ? (newData as any)(prev) : newData;
        if (url && shouldPersistCache && resolved !== null) {
          writeCache(url, resolved);
        }
        return resolved;
      });
    },
    [url]
  );

  return {
    data,
    loading,
    isRevalidating,
    error,
    mutate,
    refresh: () => revalidate(true),
  };
}
