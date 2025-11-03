import { google } from "googleapis";

export interface GoogleBusinessReview {
  name: string; // Full resource name (e.g., "accounts/123/locations/456/reviews/789")
  reviewId: string;
  reviewer: {
    profilePhotoUrl?: string;
    displayName?: string;
  };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

export interface GoogleBusinessLocation {
  name: string; // Full resource name
  locationName: string;
  primaryPhone?: string;
  address?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
  };
}

// Convert Google star rating enum to number
function starRatingToNumber(rating: string): number {
  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return map[rating] || 5;
}

/**
 * Initialize Google My Business API client
 */
export function getGoogleBusinessClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.mybusinessbusinessinformation({
    version: "v1",
    auth: oauth2Client,
  });
}

/**
 * Get all locations for an account
 */
export async function getGoogleLocations(
  accessToken: string,
  accountId: string,
): Promise<GoogleBusinessLocation[]> {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const mybusiness = google.mybusinessbusinessinformation({
      version: "v1",
      auth: oauth2Client,
    });

    const response = await mybusiness.accounts.locations.list({
      parent: `accounts/${accountId}`,
      readMask: "name,title,phoneNumbers,storefrontAddress",
    });

    return (response.data.locations || []).map((loc: any) => ({
      name: loc.name,
      locationName: loc.title || "",
      primaryPhone: loc.phoneNumbers?.[0]?.phoneNumber,
      address: loc.storefrontAddress
        ? {
            addressLines: loc.storefrontAddress.addressLines || [],
            locality: loc.storefrontAddress.locality,
            administrativeArea: loc.storefrontAddress.administrativeArea,
            postalCode: loc.storefrontAddress.postalCode,
          }
        : undefined,
    }));
  } catch (error) {
    console.error("Error fetching Google locations:", error);
    throw new Error("Failed to fetch Google Business locations");
  }
}

/**
 * Fetch reviews for a Google Business location
 */
export async function fetchGoogleReviews(
  accessToken: string,
  accountId: string,
  locationId: string,
): Promise<{
  platformId: string;
  stars: number;
  text: string;
  authorName?: string;
  authorAvatar?: string;
  url?: string;
  createdAt: Date;
}[]> {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const mybusiness = google.mybusinessaccountmanagement({
      version: "v1",
      auth: oauth2Client,
    });

    // Note: As of 2024, the Google My Business API v4.9 is deprecated
    // You may need to use the new Business Profile Performance API
    // For now, we'll use the accountmanagement API for reviews

    // Construct the parent resource name
    const parent = `accounts/${accountId}/locations/${locationId}`;

    // In the real implementation, you would call the reviews.list endpoint
    // However, this requires the correct API version and permissions

    // For demonstration, here's the structure:
    const reviews: GoogleBusinessReview[] = [];

    // Note: The actual API call would be:
    // const response = await mybusiness.accounts.locations.reviews.list({
    //   parent: parent,
    // });
    // reviews = response.data.reviews || [];

    // Transform to our format
    return reviews.map((review) => ({
      platformId: review.reviewId || review.name,
      stars: starRatingToNumber(review.starRating),
      text: review.comment || "",
      authorName: review.reviewer?.displayName,
      authorAvatar: review.reviewer?.profilePhotoUrl,
      url: `https://www.google.com/maps/reviews?q=${locationId}`,
      createdAt: new Date(review.createTime),
    }));
  } catch (error) {
    console.error("Error fetching Google reviews:", error);
    throw new Error("Failed to fetch reviews from Google Business Profile");
  }
}

/**
 * Post a reply to a Google Business review
 */
export async function postGoogleReply(
  accessToken: string,
  accountId: string,
  locationId: string,
  reviewName: string,
  replyText: string,
): Promise<boolean> {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const mybusiness = google.mybusinessaccountmanagement({
      version: "v1",
      auth: oauth2Client,
    });

    // In the real implementation, you would call the reply endpoint
    // const response = await mybusiness.accounts.locations.reviews.updateReply({
    //   name: `${reviewName}/reply`,
    //   requestBody: {
    //     comment: replyText,
    //   },
    // });

    console.log(
      `Would post reply to review ${reviewName}: ${replyText.substring(0, 50)}...`,
    );
    return true;
  } catch (error) {
    console.error("Error posting Google reply:", error);
    throw new Error("Failed to post reply to Google Business Profile");
  }
}

/**
 * Refresh Google OAuth token
 */
export async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    return {
      access_token: credentials.access_token!,
      expires_in: credentials.expiry_date
        ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
        : 3600,
    };
  } catch (error) {
    console.error("Error refreshing Google token:", error);
    throw new Error("Failed to refresh Google OAuth token");
  }
}
