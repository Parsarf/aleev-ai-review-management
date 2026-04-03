import { google } from "googleapis";

export interface GoogleBusinessReview {
  name: string;
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
  name: string;
  locationName: string;
  primaryPhone?: string;
  address?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
  };
}

export interface GoogleBusinessAccount {
  name: string;
  accountName: string;
  type?: string;
  verificationState?: string;
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
 * List Google Business accounts for a user using their stored OAuth token.
 */
export async function getGoogleAccounts(
  accessToken: string,
): Promise<GoogleBusinessAccount[]> {
  const res = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    const errBody = await res.text();
    console.error("[getGoogleAccounts] HTTP error:", res.status, errBody);
    throw new Error(
      `Failed to list Google Business accounts: ${res.status} ${res.statusText}`,
    );
  }

  const data = await res.json();
  return (data.accounts || []).map((a: any) => ({
    name: a.name,
    accountName: a.accountName || a.name,
    type: a.type,
    verificationState: a.verificationState,
  }));
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
 * Fetch reviews for a Google Business location using the v4 Reviews API.
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
  const parent = `accounts/${accountId}/locations/${locationId}`;
  const url = `https://mybusiness.googleapis.com/v4/${parent}/reviews`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("[fetchGoogleReviews] HTTP error:", res.status, errBody);
    throw new Error(
      `Failed to fetch reviews from Google Business Profile: ${res.status} ${res.statusText}`,
    );
  }

  const data = await res.json();
  const reviews: GoogleBusinessReview[] = data.reviews || [];

  return reviews.map((review) => ({
    platformId: review.reviewId || review.name,
    stars: starRatingToNumber(review.starRating),
    text: review.comment || "",
    authorName: review.reviewer?.displayName,
    authorAvatar: review.reviewer?.profilePhotoUrl,
    url: `https://www.google.com/maps/reviews?q=${locationId}`,
    createdAt: new Date(review.createTime),
  }));
}

/**
 * Post a reply to a Google Business review using the v4 Reviews API.
 */
export async function postGoogleReply(
  accessToken: string,
  accountId: string,
  locationId: string,
  reviewName: string,
  replyText: string,
): Promise<boolean> {
  try {
    // reviewName may be the short review ID or the full resource name.
    // Normalise to the full resource name expected by the v4 API.
    const fullName = reviewName.startsWith("accounts/")
      ? reviewName
      : `accounts/${accountId}/locations/${locationId}/reviews/${reviewName}`;

    const url = `https://mybusiness.googleapis.com/v4/${fullName}/reply`;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment: replyText }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[postGoogleReply] HTTP error:", res.status, errBody);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error posting Google reply:", error);
    return false;
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
    const rawUrl = (process.env.NEXTAUTH_URL || "").replace(/\/+$/, "");
    const baseUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${baseUrl}/api/auth/callback/google`,
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
