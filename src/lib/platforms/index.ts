import {
  fetchGoogleReviews,
  postGoogleReply,
  refreshGoogleToken,
} from "@/lib/google-business";
import { prisma } from "@/lib/prisma";

export interface PlatformAdapter {
  name: string;
  readReviews: (locationId: string, config: PlatformConfig) => Promise<ReviewData[]>;
  postReply: (reviewId: string, reply: string, config: PlatformConfig) => Promise<boolean>;
  isConnected: (config: PlatformConfig) => boolean;
}

export interface ReviewData {
  platformId: string;
  stars: number;
  text: string;
  authorName?: string;
  authorAvatar?: string;
  url?: string;
  createdAt: Date;
}

export interface PlatformConfig {
  accessToken?: string;
  refreshToken?: string;
  accountId?: string;
  locationId?: string;
  placeId?: string;
  businessId?: string;
  expiresAt?: number;
  prismaLocationId?: string; // Prisma Location row ID — used to persist refreshed tokens
  [key: string]: unknown;
}

/**
 * Refresh an expired Google token and persist the new token back to the
 * Location's platformAccounts JSON field in the database.
 */
async function refreshAndPersistGoogleToken(
  config: PlatformConfig,
): Promise<string> {
  if (!config.refreshToken) {
    throw new Error("Access token expired and no refresh token available");
  }

  const newTokens = await refreshGoogleToken(config.refreshToken);
  const newAccessToken = newTokens.access_token;
  const newExpiresAt = Date.now() + newTokens.expires_in * 1000;

  if (config.prismaLocationId) {
    try {
      const location = await prisma.location.findUnique({
        where: { id: config.prismaLocationId },
        select: { platformAccounts: true },
      });
      const accounts = (location?.platformAccounts as Record<string, unknown>) || {};
      accounts.google = {
        ...(accounts.google as Record<string, unknown>),
        accessToken: newAccessToken,
        expiresAt: newExpiresAt,
      };
      await prisma.location.update({
        where: { id: config.prismaLocationId },
        data: { platformAccounts: accounts as Record<string, unknown> & object },
      });
      console.log(
        "[GoogleAdapter] Persisted refreshed token for location:",
        config.prismaLocationId,
      );
    } catch (err) {
      console.error("[GoogleAdapter] Failed to persist refreshed token:", err);
    }
  }

  return newAccessToken;
}

// Google Business Profile Adapter
export class GoogleAdapter implements PlatformAdapter {
  name = "Google";

  async readReviews(
    locationId: string,
    config: PlatformConfig,
  ): Promise<ReviewData[]> {
    if (!config.accessToken || !config.accountId || !config.locationId) {
      throw new Error(
        "Google Business Profile not properly configured. Missing accessToken, accountId, or locationId.",
      );
    }

    try {
      let accessToken = config.accessToken;
      if (config.expiresAt && config.expiresAt < Date.now()) {
        accessToken = await refreshAndPersistGoogleToken({
          ...config,
          prismaLocationId: config.prismaLocationId || locationId,
        });
      }

      const reviews = await fetchGoogleReviews(
        accessToken,
        config.accountId,
        config.locationId,
      );

      return reviews;
    } catch (error) {
      console.error("Error reading Google reviews:", error);
      throw new Error(
        `Failed to read Google reviews: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async postReply(
    reviewId: string,
    reply: string,
    config: PlatformConfig,
  ): Promise<boolean> {
    if (!config.accessToken || !config.accountId || !config.locationId) {
      throw new Error("Google Business Profile not authenticated");
    }

    try {
      let accessToken = config.accessToken;
      if (config.expiresAt && config.expiresAt < Date.now()) {
        accessToken = await refreshAndPersistGoogleToken(config);
      }

      return await postGoogleReply(
        accessToken,
        config.accountId,
        config.locationId,
        reviewId,
        reply,
      );
    } catch (error) {
      console.error("Error posting Google reply:", error);
      return false;
    }
  }

  isConnected(config: PlatformConfig): boolean {
    return !!(config.accessToken && config.accountId && config.locationId);
  }
}

// Yelp Adapter (Yelp doesn't allow review replies via API)
export class YelpAdapter implements PlatformAdapter {
  name = "Yelp";

  async readReviews(
    _locationId: string,
    _config: PlatformConfig,
  ): Promise<ReviewData[]> {
    console.log("Yelp review reading not yet implemented");
    return [];
  }

  async postReply(
    _reviewId: string,
    _reply: string,
    _config: PlatformConfig,
  ): Promise<boolean> {
    return false;
  }

  isConnected(_config: PlatformConfig): boolean {
    return false;
  }
}

// Facebook Adapter (To be implemented)
export class FacebookAdapter implements PlatformAdapter {
  name = "Facebook";

  async readReviews(
    _locationId: string,
    _config: PlatformConfig,
  ): Promise<ReviewData[]> {
    console.log("Facebook review reading not yet implemented");
    return [];
  }

  async postReply(
    _reviewId: string,
    _reply: string,
    _config: PlatformConfig,
  ): Promise<boolean> {
    console.log("Facebook reply posting not yet implemented");
    return false;
  }

  isConnected(config: PlatformConfig): boolean {
    return !!(config.accessToken && config.businessId);
  }
}

// TripAdvisor Adapter (To be implemented)
export class TripAdvisorAdapter implements PlatformAdapter {
  name = "TripAdvisor";

  async readReviews(
    _locationId: string,
    _config: PlatformConfig,
  ): Promise<ReviewData[]> {
    console.log("TripAdvisor review reading not yet implemented");
    return [];
  }

  async postReply(
    _reviewId: string,
    _reply: string,
    _config: PlatformConfig,
  ): Promise<boolean> {
    console.log("TripAdvisor reply posting not yet implemented");
    return false;
  }

  isConnected(_config: PlatformConfig): boolean {
    return false;
  }
}

// Platform registry
export const platformAdapters: Record<string, PlatformAdapter> = {
  GOOGLE: new GoogleAdapter(),
  YELP: new YelpAdapter(),
  FACEBOOK: new FacebookAdapter(),
  TRIPADVISOR: new TripAdvisorAdapter(),
};

export function getAdapter(platform: string): PlatformAdapter {
  const adapter = platformAdapters[platform];
  if (!adapter) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return adapter;
}
