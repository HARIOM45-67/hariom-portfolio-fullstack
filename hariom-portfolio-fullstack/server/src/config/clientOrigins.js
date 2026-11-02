const productionClientOrigin = 'https://hariom-portfolio-fullstack.vercel.app';

export function getAllowedClientOrigins() {
  const defaultClientOrigin = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173';
  return new Set([
    ...((process.env.CLIENT_ORIGIN || defaultClientOrigin)
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean)),
    productionClientOrigin
  ]);
}
