import { type Configuration, LogLevel } from '@azure/msal-browser';

// These are injected by Vite from .env.local (dev) or Cloudflare Pages env vars (prod).
// They are NOT secrets — client ID and tenant ID are safe to be public.
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID as string;
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID as string;
const redirectUri = import.meta.env.VITE_REDIRECT_URI as string ?? window.location.origin;

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
  system: {
    loggerOptions: {
      logLevel: import.meta.env.DEV ? LogLevel.Warning : LogLevel.Error,
      loggerCallback: (_level, message, containsPii) => {
        if (!containsPii && import.meta.env.DEV) console.log(`[MSAL] ${message}`);
      },
    },
  },
};

// Scopes requested when getting a token to call our Worker API.
// The "api://<clientId>/access_as_user" scope must be exposed in the App Registration.
export const apiScopes = [`api://${clientId}/access_as_user`];

// Scopes needed if we ever call Graph directly from the frontend (e.g. user profile photo).
export const graphScopes = ['User.Read'];
