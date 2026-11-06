interface CachedReviewResponse {
  review: any;
  expiresAt: number;
}

export const reviewMemoryCache = new Map<string, CachedReviewResponse>();

export function invalidateReviewCache(userId?: string) {
  if (userId) {
    reviewMemoryCache.delete(userId);
  } else {
    reviewMemoryCache.clear();
  }
}
