/**
 * Safe String Utilities
 * 
 * These utilities ensure that string operations never throw errors,
 * even when called on non-string values (objects, null, undefined, etc.)
 */

/**
 * Safely converts any value to a string
 * @param value - Any value that needs to be converted to string
 * @param fallback - Fallback value if conversion fails (default: '')
 * @returns A safe string value
 */
export const toSafeString = (value: any, fallback: string = ''): string => {
  if (value === null || value === undefined) {
    return fallback;
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  // Handle objects with name property (like client objects)
  if (typeof value === 'object' && value.name) {
    return String(value.name);
  }
  
  // Handle objects with other common properties
  if (typeof value === 'object' && value.client_name) {
    return String(value.client_name);
  }
  
  if (typeof value === 'object' && value.filename) {
    return String(value.filename);
  }
  
  return fallback;
};

/**
 * Safely performs toLowerCase operation
 * @param value - Any value that needs toLowerCase
 * @param fallback - Fallback value if conversion fails (default: '')
 * @returns Lowercase string
 */
export const safeLowerCase = (value: any, fallback: string = ''): string => {
  const safeStr = toSafeString(value, fallback);
  return safeStr.toLowerCase();
};

/**
 * Safely performs toUpperCase operation
 * @param value - Any value that needs toUpperCase
 * @param fallback - Fallback value if conversion fails (default: '')
 * @returns Uppercase string
 */
export const safeUpperCase = (value: any, fallback: string = ''): string => {
  const safeStr = toSafeString(value, fallback);
  return safeStr.toUpperCase();
};

/**
 * Safely checks if a value includes a search term (case-insensitive)
 * @param value - The value to search in
 * @param searchTerm - The term to search for
 * @returns true if searchTerm is found, false otherwise
 */
export const safeIncludes = (value: any, searchTerm: string): boolean => {
  const safeStr = safeLowerCase(value);
  const safeSearch = safeLowerCase(searchTerm);
  return safeStr.includes(safeSearch);
};

/**
 * Safely performs string trim operation
 * @param value - Any value that needs trim
 * @param fallback - Fallback value if conversion fails (default: '')
 * @returns Trimmed string
 */
export const safeTrim = (value: any, fallback: string = ''): string => {
  const safeStr = toSafeString(value, fallback);
  return safeStr.trim();
};

/**
 * Safely performs startsWith operation
 * @param value - The value to check
 * @param prefix - The prefix to check for
 * @returns true if value starts with prefix, false otherwise
 */
export const safeStartsWith = (value: any, prefix: string): boolean => {
  const safeStr = toSafeString(value);
  return safeStr.startsWith(prefix);
};

/**
 * Safely performs split operation
 * @param value - The value to split
 * @param separator - The separator to use
 * @param fallback - Fallback value if conversion fails (default: '')
 * @returns Array of strings
 */
export const safeSplit = (value: any, separator: string, fallback: string = ''): string[] => {
  const safeStr = toSafeString(value, fallback);
  return safeStr.split(separator);
};

/**
 * Extracts client name from various client object formats
 * @param client - Client object or string
 * @returns Safe client name string
 */
export const getClientName = (client: any): string => {
  if (!client) return '';
  if (typeof client === 'string') return client;
  return client.name || client.client_name || client.clientName || '';
};

/**
 * Safely extracts nested property from object
 * @param obj - Object to extract from
 * @param path - Property path (e.g., 'user.name' or 'client.details.name')
 * @param fallback - Fallback value if property doesn't exist
 * @returns Property value or fallback
 */
export const safeGet = (obj: any, path: string, fallback: any = ''): any => {
  if (!obj || typeof obj !== 'object') return fallback;
  
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return fallback;
    }
  }
  
  return result !== undefined && result !== null ? result : fallback;
};
