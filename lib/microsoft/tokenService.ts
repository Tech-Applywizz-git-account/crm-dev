// lib/microsoft/tokenService.ts

interface TokenCache {
    accessToken: string;
    expiresAt: number;
}

let cachedTokens: Record<string, TokenCache> = {};

export async function getMicrosoftGraphToken(prefix: string = "MICROSOFT"): Promise<string> {
    const tenantId = process.env[`${prefix}_TENANT_ID`];
    const clientId = process.env[`${prefix}_CLIENT_ID`];
    const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];

    console.log(`[TokenService] Requesting token for prefix: ${prefix} (Found Tenant: ${!!tenantId})`);

    if (!tenantId || !clientId || !clientSecret) {
        // Fallback to standard MICROSOFT if TEAMS is missing
        if (prefix === "TEAMS_MICROSOFT") {
            return getMicrosoftGraphToken("MICROSOFT");
        }
        throw new Error(`Missing Microsoft Graph credentials for ${prefix} in environment variables.`);
    }

    // Use cached token if valid (buffer of 60 seconds)
    if (cachedTokens[prefix] && cachedTokens[prefix].expiresAt > Date.now() + 60000) {
        return cachedTokens[prefix].accessToken;
    }

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
        scope: "https://graph.microsoft.com/.default",
    });

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Microsoft Token Error (${prefix}):`, errorBody);
        throw new Error(`Failed to fetch Microsoft Graph token for ${prefix}: ${response.statusText}`);
    }

    const data = await response.json();

    cachedTokens[prefix] = {
        accessToken: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
}
