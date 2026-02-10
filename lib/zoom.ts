export const ZOOM_CONFIG = {
  clientId: process.env.ZOOM_CLIENT_ID,
  clientSecret: process.env.ZOOM_CLIENT_SECRET,
  accountId: process.env.ZOOM_ACCOUNT_ID,
  phoneNumber: process.env.ZOOM_PHONE_NUMBER,
};

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Gets a Server-to-Server OAuth token for Zoom.
 * Implements caching to avoid redundant calls.
 */
export async function getZoomAccessToken(): Promise<string> {
  // Check if token is still valid (with a 60-second buffer)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const { clientId, clientSecret, accountId } = ZOOM_CONFIG;

  if (!clientId || !clientSecret || !accountId) {
    throw new Error('Missing Zoom configuration in environment variables');
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Zoom Auth Error:', data);
    throw new Error(`Zoom Authentication failed: ${data.message || 'Unknown error'}`);
  }

  cachedToken = data.access_token;
  // expires_in is in seconds
  tokenExpiry = Date.now() + data.expires_in * 1000;

  return cachedToken!;
}
