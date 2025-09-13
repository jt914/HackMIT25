/**
 * Configuration utility for environment-based API settings
 */

// Get the API base URL from environment variables
const getApiUrl = (): string => {
  // In Next.js, environment variables prefixed with NEXT_PUBLIC_ are available in the browser
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (!apiUrl) {
    // Fallback to localhost for development if not set
    console.warn('NEXT_PUBLIC_API_URL not set, falling back to localhost:8000');
    return 'http://localhost:8000';
  }
  
  return apiUrl;
};

export const config = {
  apiUrl: getApiUrl(),
} as const;

/**
 * Helper function to construct API endpoint URLs
 */
export const getApiEndpoint = (path: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${config.apiUrl}/${cleanPath}`;
};
