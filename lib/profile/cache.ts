interface CachedProfileResponse {
  profile: any;
  expiresAt: number;
}

export const profileMemoryCache = new Map<string, CachedProfileResponse>();

export function invalidateProfileCache(userId?: string) {
  if (userId) {
    profileMemoryCache.delete(userId);
  } else {
    profileMemoryCache.clear();
  }
}
