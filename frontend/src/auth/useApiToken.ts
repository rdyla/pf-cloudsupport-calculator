/**
 * useApiToken — returns a function that silently acquires a fresh access token
 * for our Worker API. Components call getToken() before each API request.
 */
import { useMsal } from '@azure/msal-react';
import { apiScopes } from './msalConfig';

export function useApiToken() {
  const { instance, accounts } = useMsal();

  async function getToken(): Promise<string> {
    if (!accounts[0]) throw new Error('Not authenticated');
    const result = await instance.acquireTokenSilent({
      scopes: accounts[0].idTokenClaims?.acr ? apiScopes : apiScopes,
      account: accounts[0],
    });
    return result.accessToken;
  }

  return { getToken };
}
