/**
 * Global Error Formatting Utilities for Chovique.
 * Converts raw server errors, FastAPI Pydantic validation errors,
 * HTTP status codes, and exception details into clean, understandable human messages.
 */

const FIELD_LABEL_MAP: Record<string, string> = {
  phone: 'Phone Number',
  phone_number: 'Phone Number',
  email: 'Email Address',
  full_name: 'Full Name',
  first_name: 'First Name',
  last_name: 'Last Name',
  password: 'Password',
  confirm_password: 'Confirm Password',
  current_password: 'Current Password',
  new_password: 'New Password',
  is_active: 'Status',
  status: 'Status',
  role: 'Role',
  category: 'Category',
  category_id: 'Category',
  image: 'Image',
  image_url: 'Image URL',
  price: 'Price',
  stock: 'Stock',
  sku: 'SKU',
  weight: 'Weight',
  address: 'Address',
  pin_code: 'PIN Code',
  pincode: 'PIN Code',
  city: 'City',
  state: 'State',
  code: 'Coupon Code',
  discount: 'Discount',
  expiry_date: 'Expiry Date',
  order_id: 'Order ID',
  product_id: 'Product ID',
  quantity: 'Quantity',
};

export const formatFieldLabel = (field: string): string => {
  if (!field) return '';
  const lower = field.toLowerCase().trim();
  if (FIELD_LABEL_MAP[lower]) {
    return FIELD_LABEL_MAP[lower];
  }
  // Convert camelCase or snake_case to Title Case words
  return field
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
};

/**
 * Clean up technical prefixes such as "Value error, ", "assertion error, ", etc.
 */
export const cleanValidationMessage = (msg: string): string => {
  if (!msg || typeof msg !== 'string') return '';
  let cleaned = msg.trim();

  // Strip technical prefixes added by Pydantic / Python validators
  cleaned = cleaned.replace(/^(?:value error|assertion error|assertion failed)[:,\s]+/i, '');
  cleaned = cleaned.replace(/^input should be\s+/i, 'Must be ');

  // Capitalize first character
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Ensure message ends with period if it doesn't already have end punctuation
  if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }

  return cleaned;
};

export interface PydanticErrorItem {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
  ctx?: Record<string, any>;
  input?: any;
}

export const formatPydanticErrorItem = (item: PydanticErrorItem): string => {
  if (!item || typeof item !== 'object') {
    return typeof item === 'string' ? cleanValidationMessage(item) : '';
  }

  // Extract relevant field from `loc`, skipping root identifiers like 'body', 'query', 'path', 'header'
  const loc = Array.isArray(item.loc) ? item.loc : [];
  const fieldParts = loc.filter(
    (part) => typeof part === 'string' && !['body', 'query', 'path', 'header', 'cookie'].includes(part.toLowerCase())
  );

  const fieldKey = fieldParts.length > 0 ? String(fieldParts[fieldParts.length - 1]) : '';
  const fieldLabel = fieldKey ? formatFieldLabel(fieldKey) : '';
  const rawMsg = item.msg || 'Invalid value';
  const cleanMsg = cleanValidationMessage(rawMsg);

  if (!fieldLabel) {
    return cleanMsg;
  }

  // If the clean message already begins with the field name, don't duplicate it
  const labelLower = fieldLabel.toLowerCase();
  const msgLower = cleanMsg.toLowerCase();
  if (msgLower.startsWith(labelLower) || msgLower.startsWith(`the ${labelLower}`)) {
    return cleanMsg;
  }

  // Handle common Pydantic standard types
  if (item.type === 'missing' || cleanMsg.toLowerCase() === 'field required.') {
    return `${fieldLabel} is required.`;
  }

  return `${fieldLabel}: ${cleanMsg}`;
};

export const getStatusFallback = (status?: number, fallback = 'An unexpected error occurred. Please try again.'): string => {
  if (!status) return fallback;
  switch (status) {
    case 400:
      return 'Invalid request. Please check the entered data.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested record or resource was not found.';
    case 409:
      return 'A conflict occurred. This record may already exist in the system.';
    case 422:
      return 'Validation error. Please verify the entered form data and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server encountered an error. Please try again later or contact support.';
    case 502:
    case 503:
    case 504:
      return 'Server is temporarily unavailable. Please try again shortly.';
    default:
      return fallback;
  }
};

/**
 * Recursively parse and extract a clean human-friendly message from any error payload,
 * stringified JSON, Pydantic error array, or error object.
 */
export const formatApiErrorMessage = (
  err: unknown,
  fallback = 'An unexpected error occurred. Please try again.'
): string => {
  if (!err) return fallback;

  // 1. If it's an Error instance with a detail property or message
  if (err instanceof Error) {
    const customDetail = (err as any).detail;
    const status = (err as any).status;
    if (customDetail) {
      return parseAndCleanErrorPayload(customDetail, status, fallback);
    }
    if (err.message) {
      return parseAndCleanErrorPayload(err.message, status, fallback);
    }
  }

  // 2. If it's an object or string
  return parseAndCleanErrorPayload(err, undefined, fallback);
};

const parseAndCleanErrorPayload = (
  payload: unknown,
  status?: number,
  fallback = 'An unexpected error occurred. Please try again.'
): string => {
  if (!payload) {
    return getStatusFallback(status, fallback);
  }

  // If it's a string
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) return getStatusFallback(status, fallback);

    // If it starts with [ or { it might be JSON stringified error
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseAndCleanErrorPayload(parsed, status, fallback);
      } catch {
        // Not valid JSON, continue with string processing
      }
    }

    return cleanValidationMessage(trimmed);
  }

  // If it's an array (Pydantic validation errors)
  if (Array.isArray(payload)) {
    if (payload.length === 0) return getStatusFallback(status, fallback);

    const formattedList = payload
      .map((item) => formatPydanticErrorItem(item))
      .filter((msg) => Boolean(msg && msg.trim()));

    if (formattedList.length === 0) return getStatusFallback(status, fallback);
    return formattedList.join(' • ');
  }

  // If it's an object
  if (typeof payload === 'object') {
    const obj = payload as Record<string, any>;

    // Check for standard error keys
    if (obj.detail !== undefined) {
      return parseAndCleanErrorPayload(obj.detail, status, fallback);
    }
    if (obj.message && typeof obj.message === 'string') {
      return cleanValidationMessage(obj.message);
    }
    if (obj.error && typeof obj.error === 'string') {
      return cleanValidationMessage(obj.error);
    }
    if (obj.msg && typeof obj.msg === 'string') {
      return cleanValidationMessage(obj.msg);
    }
    if (Array.isArray(obj.errors)) {
      return parseAndCleanErrorPayload(obj.errors, status, fallback);
    }
  }

  return getStatusFallback(status, fallback);
};
