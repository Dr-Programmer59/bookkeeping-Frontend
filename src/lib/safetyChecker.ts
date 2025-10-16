/**
 * String Operation Safety Checker
 * 
 * This utility helps identify potential string operation errors in your codebase
 * Run this in the browser console to check for issues
 */

interface SafetyCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Tests if an object's properties can safely be used with string operations
 * @param obj - Object to test
 * @param propertiesToCheck - Array of property names to check
 * @returns SafetyCheckResult
 */
export const checkObjectSafety = (
  obj: any, 
  propertiesToCheck: string[]
): SafetyCheckResult => {
  const result: SafetyCheckResult = {
    passed: true,
    errors: [],
    warnings: []
  };

  if (!obj || typeof obj !== 'object') {
    result.passed = false;
    result.errors.push('Input is not an object');
    return result;
  }

  propertiesToCheck.forEach(prop => {
    const value = obj[prop];
    
    if (value === null || value === undefined) {
      result.warnings.push(`Property "${prop}" is null or undefined`);
      return;
    }

    if (typeof value !== 'string') {
      result.passed = false;
      result.errors.push(
        `Property "${prop}" is type "${typeof value}" (expected string). ` +
        `Value: ${JSON.stringify(value)}`
      );
    }
  });

  return result;
};

/**
 * Tests if an array of objects can safely be filtered using string operations
 * @param array - Array to test
 * @param propertiesToCheck - Properties that will be used in filters
 * @returns SafetyCheckResult with detailed report
 */
export const checkArrayFilterSafety = (
  array: any[], 
  propertiesToCheck: string[]
): SafetyCheckResult => {
  const result: SafetyCheckResult = {
    passed: true,
    errors: [],
    warnings: []
  };

  if (!Array.isArray(array)) {
    result.passed = false;
    result.errors.push('Input is not an array');
    return result;
  }

  array.forEach((item, index) => {
    const itemCheck = checkObjectSafety(item, propertiesToCheck);
    
    if (!itemCheck.passed) {
      result.passed = false;
      itemCheck.errors.forEach(error => {
        result.errors.push(`[Item ${index}] ${error}`);
      });
    }
    
    itemCheck.warnings.forEach(warning => {
      result.warnings.push(`[Item ${index}] ${warning}`);
    });
  });

  return result;
};

/**
 * Global safety check for common data structures in your app
 * Run this in console: window.runSafetyCheck()
 */
export const runGlobalSafetyCheck = () => {
  console.log('🔍 Running Global Safety Check...\n');

  // Check localStorage data
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      console.log('✓ User data:', checkObjectSafety(user, ['name', 'email', 'role']));
    }
  } catch (e) {
    console.error('✗ Error checking user data:', e);
  }

  // You can add more checks here based on your app's data structures
  console.log('\n✅ Safety check complete!');
};

/**
 * Monitor function that warns when toLowerCase is called on non-strings
 * Add this to your app's initialization
 */
export const monitorStringOperations = () => {
  const originalToLowerCase = String.prototype.toLowerCase;
  
  String.prototype.toLowerCase = function(this: any) {
    if (typeof this !== 'string' && typeof this.toString !== 'function') {
      console.error(
        '⚠️ WARNING: toLowerCase called on non-string value!',
        '\nValue:', this,
        '\nType:', typeof this,
        '\nStack trace:', new Error().stack
      );
      return '';
    }
    return originalToLowerCase.call(this);
  };

  console.log('🛡️ String operation monitoring enabled');
};

/**
 * Check if a filter function is safe
 * @param filterFn - Filter function to test
 * @param sampleData - Sample data to test with
 */
export const testFilterSafety = (
  filterFn: (item: any) => boolean,
  sampleData: any[]
): SafetyCheckResult => {
  const result: SafetyCheckResult = {
    passed: true,
    errors: [],
    warnings: []
  };

  sampleData.forEach((item, index) => {
    try {
      filterFn(item);
    } catch (error: any) {
      result.passed = false;
      result.errors.push(
        `[Item ${index}] Filter threw error: ${error.message}\n` +
        `Item: ${JSON.stringify(item)}`
      );
    }
  });

  return result;
};

// Expose to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).runSafetyCheck = runGlobalSafetyCheck;
  (window as any).checkObjectSafety = checkObjectSafety;
  (window as any).checkArrayFilterSafety = checkArrayFilterSafety;
  (window as any).testFilterSafety = testFilterSafety;
}
