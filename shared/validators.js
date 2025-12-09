// shared/validators.js
// Simple validation utilities that can be reused on web + React Native.

export function validateEmail(email) {
  if (!email) return 'Email is required';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'Invalid email format';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
}

export function validateRequired(value, fieldName = 'Field') {
  if (!value || String(value).trim() === '') {
    return `${fieldName} is required`;
  }
  return null;
}
