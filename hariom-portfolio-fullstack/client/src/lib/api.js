import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
if (import.meta.env.PROD) {
  if (!configuredApiUrl) {
    throw new Error('VITE_API_URL must be set to the deployed backend URL for production builds.');
  }

  let productionApiUrl;
  try {
    productionApiUrl = new URL(configuredApiUrl);
  } catch {
    throw new Error('VITE_API_URL must be an absolute HTTPS backend URL in production.');
  }
  if (productionApiUrl.protocol !== 'https:' ||
      ['localhost', '127.0.0.1', '[::1]'].includes(productionApiUrl.hostname)) {
    throw new Error('VITE_API_URL must use the deployed HTTPS backend, not localhost.');
  }
}

const apiBaseUrl = configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:5000' : '');

export const api = axios.create({
  baseURL: apiBaseUrl.replace(/\/+$/, ''),
  withCredentials: true,
  headers: { Accept: 'application/json' }
});

export function getApiErrorMessage(error, fallback) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message
      || (error.code === 'ERR_NETWORK' ? 'The API is unavailable. Please try again later.' : fallback);
  }
  return error instanceof Error ? error.message : fallback;
}
