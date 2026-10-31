import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: configuredApiUrl.replace(/\/+$/, ''),
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
