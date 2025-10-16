/**
 * Automated Page Testing Script
 * 
 * Run this in the browser console on each page to test for string operation safety
 * Usage: Copy and paste this into browser console, then call testCurrentPage()
 */

(function() {
  // Test data generators
  const createMockData = () => ({
    // Problematic data types that caused issues
    nullValue: null,
    undefinedValue: undefined,
    objectClient: { _id: '123', name: 'Test Client' },
    stringClient: 'Test Client',
    numberValue: 12345,
    boolValue: true,
    emptyString: '',
    nestedObject: { client: { name: 'Nested Client' } }
  });

  // Test filter operations
  const testFilters = () => {
    console.log('🧪 Testing Filter Operations...\n');
    
    const testData = createMockData();
    const results = {
      passed: 0,
      failed: 0,
      errors: []
    };

    // Test toLowerCase on various types
    Object.entries(testData).forEach(([key, value]) => {
      try {
        // This is what the OLD code was doing (unsafe)
        if (value && typeof value.toLowerCase === 'function') {
          value.toLowerCase();
          results.passed++;
        } else if (value === null || value === undefined) {
          results.passed++; // Expected to be null/undefined
        } else {
          // This would fail in old code
          results.failed++;
          results.errors.push(`${key}: Cannot call toLowerCase on ${typeof value}`);
        }
      } catch (e) {
        results.failed++;
        results.errors.push(`${key}: ${e.message}`);
      }
    });

    console.log('📊 Filter Test Results:');
    console.log(`  ✅ Passed: ${results.passed}`);
    console.log(`  ❌ Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
      console.log('\n⚠️ Errors found:');
      results.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    return results.failed === 0;
  };

  // Test current page's state
  const testCurrentPage = () => {
    console.log('🔍 Testing Current Page for String Safety Issues\n');
    console.log('📍 Current URL:', window.location.href);
    console.log('📅 Test Time:', new Date().toISOString());
    console.log('\n' + '='.repeat(50) + '\n');

    // Test filter operations
    const filtersPassed = testFilters();

    // Check React component tree for errors
    console.log('\n🔎 Checking for React Errors...');
    const hasReactErrors = document.querySelector('[class*="error"]') !== null;
    if (hasReactErrors) {
      console.log('⚠️ Error component detected on page');
    } else {
      console.log('✅ No error components visible');
    }

    // Check console for errors
    console.log('\n📋 Recent Console Errors:');
    // Note: Can't access console.error history, but we log this for manual check
    console.log('(Check console manually for any red errors above)');

    // Test localStorage
    console.log('\n💾 Testing LocalStorage Data...');
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('User data:', user);
      
      if (user && typeof user === 'object') {
        console.log('✅ User data is valid object');
      }
    } catch (e) {
      console.log('⚠️ Error parsing user data:', e);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL RESULTS:');
    console.log('='.repeat(50));
    
    const allPassed = filtersPassed && !hasReactErrors;
    
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED - Page is safe!');
    } else {
      console.log('❌ SOME TESTS FAILED - Review errors above');
    }
    
    return allPassed;
  };

  // Test all interactive elements
  const testInteractiveElements = () => {
    console.log('\n🖱️ Testing Interactive Elements...\n');

    // Find all search inputs
    const searchInputs = document.querySelectorAll('input[placeholder*="search" i], input[placeholder*="Search" i]');
    console.log(`Found ${searchInputs.length} search input(s)`);

    // Find all select dropdowns
    const selects = document.querySelectorAll('select');
    console.log(`Found ${selects.length} dropdown(s)`);

    // Find all buttons
    const buttons = document.querySelectorAll('button');
    console.log(`Found ${buttons.length} button(s)`);

    return {
      searchInputs: searchInputs.length,
      selects: selects.length,
      buttons: buttons.length
    };
  };

  // Comprehensive test suite
  const runFullTest = () => {
    console.clear();
    console.log('🚀 Running Full Safety Test Suite\n');
    
    testCurrentPage();
    testInteractiveElements();
    
    console.log('\n✨ Test Complete!\n');
    console.log('💡 Tips:');
    console.log('  1. Try typing in search boxes');
    console.log('  2. Select different options from dropdowns');
    console.log('  3. Watch console for any errors');
    console.log('  4. Test with slow network (throttle in DevTools)');
  };

  // Expose to window
  window.testCurrentPage = testCurrentPage;
  window.runFullTest = runFullTest;
  window.testFilters = testFilters;
  window.testInteractiveElements = testInteractiveElements;

  console.log('🛠️ Testing utilities loaded!');
  console.log('📚 Available commands:');
  console.log('  • testCurrentPage() - Quick test current page');
  console.log('  • runFullTest() - Comprehensive test suite');
  console.log('  • testFilters() - Test filter operations');
  console.log('  • testInteractiveElements() - Count interactive elements');
})();
