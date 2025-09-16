# COA Data API Integration

## Overview
Enhanced transaction categorization to use direct COA CSV data from the backend API instead of processed accounts. This provides richer account information and better user experience for manual category selection.

## New API Endpoint Integration

### Added Endpoint: `GET /coa/{clientId}/data`
```typescript
getCOAData: (clientId: string): Promise<AxiosResponse<{
  coa_id: string;
  filename: string;
  uploaded_at: string;
  version: number;
  total_rows: number;
  headers: string[];
  data: Array<{
    "": string;
    "Accnt. #": string;
    "Account": string;
    "Type": string;
    "Detail Type": string;
    "Balance": string;
  }>;
}>>
```

## Implementation Changes

### 1. Enhanced Category Data Structure
For desktop clients using uploaded COA CSV files:
```typescript
{
  _id: account["Accnt. #"] || account.Account,
  name: account.Account,
  number: account["Accnt. #"],
  type: account.Type,
  detailType: account["Detail Type"],
  balance: account.Balance,
  displayText: account["Accnt. #"] 
    ? `${account["Accnt. #"]} - ${account.Account}` 
    : account.Account
}
```

### 2. Updated Category Loading Logic
- **Desktop Clients**: Now uses `coaAPI.getCOAData()` instead of `getCOAAccounts()`
- **Online Clients**: Still uses QuickBooks API as before
- **Fallback**: Regular categories API for unspecified account types

### 3. Enhanced Category Selection UI
- **Rich Display**: Shows account number, name, type, detail type, and balance
- **Format**: "10100 - Checking • Bank • Checking • Balance: $15000.00"
- **Dynamic Values**: Uses appropriate data based on client type
- **Improved UX**: More informative account selection

### 4. Updated Functions
- `fetchCategories()` - Enhanced with COA data parsing
- `refreshCategories()` - Updated to use new API endpoint
- Category mapping logic for consistent data structure

## Benefits

### 1. **Richer Account Information**
- Account numbers with names
- Account types and detail types
- Current balances
- Complete CSV data structure

### 2. **Better User Experience**
- More descriptive category options
- Clearer account identification
- Professional accounting format
- Enhanced visual hierarchy

### 3. **Direct Data Access**
- No data transformation loss
- Real-time CSV content
- Maintains original structure
- Supports Excel and CSV files

### 4. **Consistent API Integration**
- Standardized endpoint usage
- Proper error handling
- Loading states management
- Toast notifications

## User Interface Updates

### Category Selection Dropdown
```tsx
// Desktop clients see:
"10100 - Checking"
"Bank • Checking • Balance: $15000.00"

// Online clients see:
"Checking"
"#10100 • Bank"
```

### Enhanced Information Display
- **Primary Line**: Account number and name
- **Secondary Line**: Type, detail type, and balance
- **Conditional Rendering**: Shows available information only
- **Type-Aware Formatting**: Different formats for different client types

## Error Handling

### Graceful Degradation
- API failures fallback to empty categories
- Clear error messages via toast notifications
- Loading states prevent UI issues
- Client type awareness for error context

### User Feedback
- Loading indicators during data fetch
- Success confirmations for updates
- Error descriptions with context
- Retry mechanisms via refresh button

## Rule Creation Integration

### Enhanced Rule Data
When creating auto-categorization rules:
- **Desktop Clients**: Uses full display text (e.g., "10100 - Checking")
- **Online Clients**: Uses account names as before
- **Consistent API**: Same `rulesAPI.createRule` endpoint
- **Better Matching**: More precise vendor-to-account mapping

## Testing Status
✅ TypeScript compilation passes  
✅ API integration ready  
✅ UI components updated  
✅ Error handling implemented  
✅ Loading states managed  
✅ Rule creation compatible  

## Future Enhancements
- COA data caching for performance
- Account search/filtering
- Balance threshold indicators
- Account hierarchy display
- Bulk categorization tools

The implementation provides a seamless upgrade to richer COA data while maintaining backward compatibility and enhancing the user experience! 🚀
