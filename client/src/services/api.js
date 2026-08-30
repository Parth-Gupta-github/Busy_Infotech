const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Universal fetch wrapper for API calls
 * Automatically attaches Authorization header if JWT token exists in localStorage
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // Handle CSV response streams
  if (headers['Accept'] === 'text/csv' || endpoint.includes('/export/csv')) {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to download CSV');
    }
    return response.blob();
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'An unexpected error occurred');
  }

  return data;
}
