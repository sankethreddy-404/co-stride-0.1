interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class InvitationRateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly maxInvitations: number;
  private readonly windowMs: number;

  constructor(maxInvitations = 10, windowMinutes = 60) {
    this.maxInvitations = maxInvitations;
    this.windowMs = windowMinutes * 60 * 1000; // Convert to milliseconds
  }

  checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    // Clean up expired entries
    this.cleanup();

    if (!entry || now > entry.resetTime) {
      // No existing entry or entry has expired
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      this.limits.set(identifier, newEntry);

      return {
        allowed: true,
        remaining: this.maxInvitations - 1,
        resetTime: newEntry.resetTime,
      };
    }

    if (entry.count >= this.maxInvitations) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Increment the count
    entry.count++;
    this.limits.set(identifier, entry);

    return {
      allowed: true,
      remaining: this.maxInvitations - entry.count,
      resetTime: entry.resetTime,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  // Get current status without incrementing
  getStatus(identifier: string): { count: number; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || now > entry.resetTime) {
      return {
        count: 0,
        remaining: this.maxInvitations,
        resetTime: now + this.windowMs,
      };
    }

    return {
      count: entry.count,
      remaining: Math.max(0, this.maxInvitations - entry.count),
      resetTime: entry.resetTime,
    };
  }

  // Reset rate limit for a specific identifier (useful for testing or admin actions)
  reset(identifier: string) {
    this.limits.delete(identifier);
  }
}

// Export a singleton instance
export const invitationRateLimiter = new InvitationRateLimiter(
  parseInt(process.env.INVITATION_RATE_LIMIT_COUNT || '10'),
  parseInt(process.env.INVITATION_RATE_LIMIT_WINDOW_MINUTES || '60')
);