import {
  fetchGoogleReviews,
  postGoogleReply,
  refreshGoogleToken,
} from "@/lib/google-business";

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
  [key: string]: unknown;
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
      // Check if token needs refresh
      let accessToken = config.accessToken;
      if (config.expiresAt && config.expiresAt < Date.now()) {
        if (!config.refreshToken) {
          throw new Error("Access token expired and no refresh token available");
        }
        const newTokens = await refreshGoogleToken(config.refreshToken);
        accessToken = newTokens.access_token;
        // Note: In a real app, you'd update the stored config with new tokens
      }

      // Fetch reviews from Google My Business API
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
      // Check if token needs refresh
      let accessToken = config.accessToken;
      if (config.expiresAt && config.expiresAt < Date.now()) {
        if (!config.refreshToken) {
          throw new Error("Access token expired and no refresh token available");
        }
        const newTokens = await refreshGoogleToken(config.refreshToken);
        accessToken = newTokens.access_token;
        // Note: In a real app, you'd update the stored config with new tokens
      }

      // Post reply to Google My Business API
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
    // Yelp API can be used to fetch reviews, but replies are not supported
    console.log("Yelp review reading not yet implemented");
    return [];
  }

  async postReply(
    _reviewId: string,
    _reply: string,
    _config: PlatformConfig,
  ): Promise<boolean> {
    // Yelp doesn't allow businesses to reply to reviews via API
    return false;
  }

  isConnected(_config: PlatformConfig): boolean {
    return false; // Yelp integration not active
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
    return false; // TripAdvisor integration not active
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
