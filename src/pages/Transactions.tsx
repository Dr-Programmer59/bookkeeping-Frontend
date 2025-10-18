import React, { useState, useEffect } from 'react';
import { transactionAPI, clientsAPI, categoriesAPI, quickbooksAPI, coaAPI, rulesAPI, exportAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Plus, Download } from 'lucide-react';

export const Transactions: React.FC = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushResults, setPushResults] = useState<any | null>(null);
  
  // Rule creation dialog state
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [ruleDialogData, setRuleDialogData] = useState<{
    transactionId: string;
    vendorName: string;
    selectedCategory: string;
  } | null>(null);
  const [creatingRule, setCreatingRule] = useState(false);
  
  // IIF Export state
  const [showIIFDialog, setShowIIFDialog] = useState(false);
  const [iifExporting, setIifExporting] = useState(false);
  const [registerAccountName, setRegisterAccountName] = useState('');

  // Push All Approved Transactions to QuickBooks (single button)
  const handlePushAllApproved = async () => {
    if (!selectedClient) return;
    setPushLoading(true);
    try {
      const uploadId = transactions[0]?.upload_id;
      if (!uploadId) {
        toast({ title: 'No upload found', variant: 'destructive' });
        setPushLoading(false);
        return;
      }
      const res = await quickbooksAPI.pushAllApproved(selectedClient._id, uploadId);
      setPushResults(res.data);
      toast({
        title: 'Push Complete',
        description: `Pushed: ${res.data.pushed}, Skipped: ${res.data.skipped}, Failed: ${res.data.failed}`,
      });
    } catch (err: any) {
      if (err.response?.status === 401) {
        toast({ title: 'Reconnect to QuickBooks', description: 'Please reconnect and try again.', variant: 'destructive' });
      } else {
        toast({ title: 'Push Error', description: err.response?.data?.error || 'Error pushing transactions', variant: 'destructive' });
      }
    }
    setPushLoading(false);
  };

  // Refresh categories manually
  const refreshCategories = async () => {
    if (!selectedClient) return;
    
    setCategoriesLoading(true);
    try {
      if (selectedClient.account_type === 'desktop') {
        // For desktop clients, get COA data from uploaded CSV
        const res = await coaAPI.getCOAData(selectedClient._id);
        const coaData = res.data.data || [];
        setCategories(coaData.map((account: any) => ({
          _id: account["Accnt. #"] || account.Account,
          name: account.Account,
          number: account["Accnt. #"],
          type: account.Type,
          detailType: account["Detail Type"],
          balance: account.Balance,
          // Create display text that includes account number and name
          displayText: account["Accnt. #"] 
            ? `${account["Accnt. #"]} - ${account.Account}` 
            : account.Account
        })));
      } else if (selectedClient.account_type === 'online') {
        const res = await quickbooksAPI.getAccounts(selectedClient._id);
        const qbAccounts = res.data || [];
        setCategories(qbAccounts.map((account: any) => ({
          _id: account.id,
          name: account.fullName || account.name,
          number: account.number,
          type: account.type
        })));
      }
      toast({ title: 'Categories refreshed', description: `Loaded ${categories.length} categories` });
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to refresh categories', variant: 'destructive' });
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Fetch all clients on mount
  useEffect(() => {
    clientsAPI.getClients()
      .then(res => setClients(res.data))
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load clients', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch categories based on client type
  useEffect(() => {
    if (!selectedClient) return;

    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        if (selectedClient.account_type === 'desktop') {
          // For desktop clients, get COA data from uploaded CSV
          const res = await coaAPI.getCOAData(selectedClient._id);
          const coaData = res.data.data || [];
          setCategories(coaData.map((account: any) => ({
            _id: account["Accnt. #"] || account.Account,
            name: account.Account,
            number: account["Accnt. #"],
            type: account.Type,
            detailType: account["Detail Type"],
            balance: account.Balance,
            // Create display text that includes account number and name
            displayText: account["Accnt. #"] 
              ? `${account["Accnt. #"]} - ${account.Account}` 
              : account.Account
          })));
        } else if (selectedClient.account_type === 'online') {
          // For online clients, get COA from QuickBooks API
          const res = await quickbooksAPI.getAccounts(selectedClient._id);
          const qbAccounts = res.data || [];
          setCategories(qbAccounts.map((account: any) => ({
            _id: account.id,
            name: account.fullName || account.name,
            number: account.number,
            type: account.type
          })));
        } else {
          // Fallback to regular categories if account type is not specified
          const res = await categoriesAPI.getCategories();
          setCategories(res.data);
        }
      } catch (err: any) {
        console.error('Failed to load categories:', err);
        toast({ 
          title: 'Error', 
          description: `Failed to load categories for ${selectedClient.account_type} client`, 
          variant: 'destructive' 
        });
        // Fallback to empty categories
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, [selectedClient, toast]);

  // Fetch transactions for selected client
  useEffect(() => {
    if (selectedClient) {
      setTxLoading(true);
      transactionAPI.getTransactionsByClient(selectedClient._id)
        .then(res => setTransactions(res.data))
        .catch(() => {
          toast({ title: 'Error', description: `Failed to load transactions for ${selectedClient.name}`, variant: 'destructive' });
        })
        .finally(() => setTxLoading(false));
    }
  }, [selectedClient, toast]);

  // Handle manual category change
  const handleManualCategoryChange = async (transaction_id: string, category: string) => {
    try {
      await transactionAPI.updateTransaction(transaction_id, { manual_category: category });
      setTransactions(transactions =>
        transactions.map(tx =>
          tx.transaction_id === transaction_id
            ? { ...tx, manual_category: category }
            : tx
        )
      );
      toast({ title: 'Category Updated', description: 'Manual category updated successfully.' });
      
      // Find the transaction to get vendor name for rule creation
      const transaction = transactions.find(tx => tx.transaction_id === transaction_id);
      if (transaction?.vendor_name) {
        setRuleDialogData({
          transactionId: transaction_id,
          vendorName: transaction.vendor_name,
          selectedCategory: category
        });
        setShowRuleDialog(true);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.error || 'Failed to update category', variant: 'destructive' });
    }
  };

  // Handle rule creation
  const handleCreateRule = async () => {
    if (!ruleDialogData || !selectedClient) return;
    
    setCreatingRule(true);
    try {
      await rulesAPI.createRule({
        client_id: selectedClient._id,
        vendor_contains: ruleDialogData.vendorName,
        map_to_account: ruleDialogData.selectedCategory
      });
      
      toast({ 
        title: 'Rule Created', 
        description: `Auto-categorization rule created for vendor "${ruleDialogData.vendorName}"` 
      });
      
      setShowRuleDialog(false);
      setRuleDialogData(null);
    } catch (err: any) {
      toast({ 
        title: 'Error Creating Rule', 
        description: err?.response?.data?.error || 'Failed to create rule', 
        variant: 'destructive' 
      });
    } finally {
      setCreatingRule(false);
    }
  };

  // Handle IIF export for desktop clients
  const handleIIFExport = async () => {
    if (!selectedClient || !registerAccountName.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a register account name.',
        variant: 'destructive'
      });
      return;
    }

    setIifExporting(true);
    try {
      // Get all transaction IDs
      const transactionIds = transactions.map(tx => tx.transaction_id);
      
      if (transactionIds.length === 0) {
        toast({
          title: 'No Transactions',
          description: 'No transactions available to export.',
          variant: 'destructive'
        });
        setIifExporting(false);
        return;
      }

      toast({
        title: 'Creating IIF File',
        description: 'Please wait while we generate your IIF file...'
      });

      // Call the API to get the IIF file
      const response = await exportAPI.exportIIFDirect(selectedClient._id, {
        transaction_ids: transactionIds,
        register_account_name: registerAccountName.trim()
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedClient.name}_transactions.iif`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `IIF file downloaded successfully for ${transactionIds.length} transactions.`
      });

      setShowIIFDialog(false);
      setRegisterAccountName('');
    } catch (err: any) {
      toast({
        title: 'Export Failed',
        description: err?.response?.data?.error || 'Failed to export IIF file',
        variant: 'destructive'
      });
    } finally {
      setIifExporting(false);
    }
  };

  // Handle approval toggle
  const handleApprovalToggle = async (transaction_id: string, currentApproval: boolean) => {
    try {
      const newApproval = !currentApproval;
      await transactionAPI.updateTransaction(transaction_id, { approved: newApproval });
      setTransactions(transactions =>
        transactions.map(tx =>
          tx.transaction_id === transaction_id
            ? { ...tx, approved: newApproval }
            : tx
        )
      );
      toast({ 
        title: 'Approval Updated', 
        description: `Transaction ${newApproval ? 'approved' : 'unapproved'} successfully.` 
      });
    } catch (err: any) {
      toast({ 
        title: 'Error', 
        description: err?.response?.data?.error || 'Failed to update approval', 
        variant: 'destructive' 
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  // First screen: List all clients
  if (!selectedClient) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-foreground">Clients</h1>
        <Card>
          <CardHeader>
            <CardTitle>Available Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map(client => (
                  <TableRow key={client._id}>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => setSelectedClient(client)}>
                        View Transactions
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Second screen: Show transactions for selected client
  return (
    <div className="space-y-8">
      <Button variant="outline" onClick={() => setSelectedClient(null)}>
        ← Back to Clients
      </Button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Transactions for {selectedClient.name} <span className="text-muted-foreground text-base">({selectedClient.email})</span>
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant={selectedClient.account_type === 'online' ? 'default' : 'secondary'}>
            {selectedClient.account_type === 'online' ? 'QuickBooks Online' : 'QuickBooks Desktop'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {categoriesLoading ? (
              'Loading categories...'
            ) : categories.length > 0 ? (
              `${categories.length} categories from ${selectedClient.account_type === 'online' ? 'QB API' : 'COA CSV'}`
            ) : (
              selectedClient.account_type === 'desktop' ? 'No COA uploaded' : 'No categories'
            )}
          </Badge>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={refreshCategories}
            disabled={categoriesLoading}
            title="Refresh categories"
          >
            <RefreshCw className={`h-4 w-4 ${categoriesLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      {/* Stats Cards */}
      <div className="flex gap-4 mb-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{transactions.filter(tx => tx.approved).length}</span>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{transactions.filter(tx => !tx.approved).length}</span>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Pushed to QuickBooks</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{transactions.filter(tx => tx.qb_id).length}</span>
          </CardContent>
        </Card>
      </div>
      {/* Export/Push buttons based on client type */}
      <div className="flex gap-2 mb-4">
        {selectedClient?.account_type === 'online' ? (
          <Button onClick={handlePushAllApproved} disabled={pushLoading}>
            {pushLoading ? 'Pushing...' : 'Push to QuickBooks'}
          </Button>
        ) : selectedClient?.account_type === 'desktop' ? (
          <Button onClick={() => setShowIIFDialog(true)} disabled={iifExporting}>
            <Download className="h-4 w-4 mr-2" />
            {iifExporting ? 'Creating IIF...' : 'Export IIF'}
          </Button>
        ) : null}
      </div>
      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div>Loading transactions...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Transaction Type</TableHead>
                  <TableHead>Auto Category</TableHead>
                  <TableHead>Manual Category</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Push Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No transactions found for this client.
                    </TableCell>
                  </TableRow>
                ) : (
                  // Show all transactions
                  transactions.map(tx => (
                    <TableRow key={tx.transaction_id}>
                      <TableCell>{tx.transaction_id}</TableCell>
                      <TableCell>{tx.vendor_name}</TableCell>
                      <TableCell>
                        {(() => {
                          const num = Number(tx.amount);
                          const isCredit = (!isNaN(num) && num < 0) || (tx.transaction_type && String(tx.transaction_type).toLowerCase() === 'credit');
                          const display = `${isCredit ? '-' : '+'}$${Math.abs(Number(tx.amount) || 0).toFixed(2)}`;
                          const colorClass = isCredit ? 'text-destructive' : 'text-success';
                          return <span className={colorClass}>{display}</span>;
                        })()}
                      </TableCell>
                      <TableCell>{tx.payment_type}</TableCell>
                      <TableCell>{tx.transaction_type}</TableCell>
                        <TableCell>
                          {tx.auto_category
                            ? tx.auto_category
                            : <span className="text-warning">1480 - Ask Client</span>
                          }
                        </TableCell>
                        <TableCell>
                          {categoriesLoading ? (
                            <span className="text-muted-foreground text-sm">Loading categories...</span>
                          ) : categories.length > 0 ? (
                            <Select
                              value={tx.manual_category || ''}
                              onValueChange={val => handleManualCategoryChange(tx.transaction_id, val)}
                            >
                              <SelectTrigger className={`w-[220px] ${
                                tx.manual_category 
                                  ? 'border-green-300 bg-green-50' 
                                  : 'border-gray-300'
                              }`}>
                                <SelectValue 
                                  placeholder="Select category" 
                                  className={tx.manual_category ? 'text-green-800' : ''}
                                />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {categories.map((cat: any) => (
                                  <SelectItem 
                                    key={cat._id} 
                                    value={selectedClient?.account_type === 'desktop' 
                                      ? cat.displayText || cat.name 
                                      : cat.name
                                    }
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {selectedClient?.account_type === 'desktop' 
                                          ? cat.displayText || cat.name 
                                          : cat.name
                                        }
                                      </span>
                                      {(cat.type || cat.detailType || cat.balance) && (
                                        <span className="text-xs text-muted-foreground">
                                          {cat.type && `${cat.type}`}
                                          {cat.detailType && cat.type && ' • '}
                                          {cat.detailType && `${cat.detailType}`}
                                          {cat.balance && ` • Balance: $${cat.balance}`}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="text-muted-foreground text-sm">
                                {selectedClient?.account_type === 'desktop' 
                                  ? 'No COA uploaded' 
                                  : 'No categories available'}
                              </span>
                              {selectedClient?.account_type === 'desktop' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => window.location.href = '/clients'}
                                  className="text-xs h-6"
                                >
                                  Upload COA
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={tx.approved ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleApprovalToggle(tx.transaction_id, tx.approved)}
                            className={`h-6 text-xs ${
                              tx.approved 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300' 
                                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300'
                            }`}
                          >
                            {tx.approved ? '✓ Approved' : '○ Pending'}
                          </Button>
                        </TableCell>
                        <TableCell>{tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          {pushResults?.results?.find(r => r._id === tx.transaction_id)?.ok
                            ? <Badge className="bg-success">Pushed (QBO #{pushResults.results.find(r => r._id === tx.transaction_id).qbo_txn_id})</Badge>
                            : pushResults?.results?.find(r => r._id === tx.transaction_id)?.skipped
                              ? <Badge className="bg-muted">Already pushed (QBO #{pushResults.results.find(r => r._id === tx.transaction_id).qbo_txn_id})</Badge>
                              : pushResults?.results?.find(r => r._id === tx.transaction_id)?.error
                                ? <span className="text-red-500">{pushResults.results.find(r => r._id === tx.transaction_id).error}</span>
                                : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Rule Creation Dialog */}
      <AlertDialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Auto-Categorization Rule
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Would you like to create an automatic categorization rule for this vendor?
              </p>
              {ruleDialogData && (
                <div className="bg-muted p-3 rounded-md space-y-1">
                  <p><strong>Vendor:</strong> {ruleDialogData.vendorName}</p>
                  <p><strong>Category:</strong> {ruleDialogData.selectedCategory}</p>
                  <p className="text-sm text-muted-foreground">
                    Future transactions containing "{ruleDialogData.vendorName}" will be automatically categorized as "{ruleDialogData.selectedCategory}".
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Skip</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCreateRule}
              disabled={creatingRule}
            >
              {creatingRule ? 'Creating...' : 'Yes, Create Rule'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* IIF Export Dialog */}
      <AlertDialog open={showIIFDialog} onOpenChange={setShowIIFDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export to QuickBooks Desktop (IIF)
            </AlertDialogTitle>
            <AlertDialogDescription>
              Export approved transactions as an IIF file for QuickBooks Desktop.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-account">Register Account Name</Label>
              <Input
                id="register-account"
                value={registerAccountName}
                onChange={(e) => setRegisterAccountName(e.target.value)}
                placeholder="e.g., Checking Account"
                disabled={iifExporting}
              />
              <p className="text-xs text-muted-foreground">
                The QuickBooks account where these transactions will be imported.
              </p>
            </div>
            
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm">
                <strong>Total Transactions:</strong> {transactions.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                All transactions will be included in the export.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={iifExporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleIIFExport}
              disabled={iifExporting || !registerAccountName.trim()}
            >
              {iifExporting ? 'Creating IIF...' : 'Download IIF File'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};





