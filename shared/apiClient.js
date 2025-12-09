// shared/apiClient.js
// Lightweight API client that can be reused in web + React Native.
// It only relies on the global `fetch` API.

const DEFAULT_BASE_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env.API_URL) ||
  'http://localhost:4000/api';

export const apiBaseUrl = DEFAULT_BASE_URL;

/**
 * Wraps fetch with JSON handling and error normalization.
 * @param {string} path - API path, e.g. '/auth/login'
 * @param {object} options - fetch options
 */
export async function apiRequest(path, options = {}) {
  const url = path.startsWith('http') ? path : `${DEFAULT_BASE_URL}${path}`;

  const fetchOptions = { ...options };
  const isFormData = fetchOptions.body instanceof FormData;

  // базური ჰედერები
  fetchOptions.headers = {
    ...(fetchOptions.headers || {}),
  };

  // თუ body არსებობს და არაა FormData → ვაბრუნებთ JSON request-ს
  if (!isFormData && fetchOptions.body) {
    // Content-Type ყოველთვის დავაყენოთ თუ FormData არაა
    if (!fetchOptions.headers['Content-Type']) {
      fetchOptions.headers['Content-Type'] = 'application/json';
    }
    // თუ ობიექტია, არა string → გავსტრინგოთ
    if (typeof fetchOptions.body !== 'string') {
      fetchOptions.body = JSON.stringify(fetchOptions.body);
    }
  }

  const response = await fetch(url, fetchOptions);

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const message = data && data.message ? data.message : 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Helper to attach Authorization header with a JWT token.
 */
export function withAuth(token, options = {}) {
  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  };
}
