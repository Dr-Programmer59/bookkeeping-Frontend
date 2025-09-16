import React, { useState, useEffect } from 'react';
import { exportAPI, clientsAPI, transactionAPI, getClientWorkflow } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload as UploadIcon, FileText, AlertCircle } from 'lucide-react';

export const Export: React.FC = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'journal_entries' | 'bank_transactions'>('journal_entries');
  const [loading, setLoading] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);

  // Fetch clients on mount
  useEffect(() => {
    clientsAPI.getClients()
      .then(res => setClients(res.data))
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load clients', variant: 'destructive' });
      });
  }, [toast]);

  // Fetch transactions when client is selected
  useEffect(() => {
    if (selectedClient) {
      transactionAPI.getTransactionsByClient(selectedClient._id)
        .then(res => {
          // Only show approved transactions
          const approvedTransactions = res.data.filter((tx: any) => tx.approved);
          setTransactions(approvedTransactions);
          setSelectedTransactions([]);
        })
        .catch(() => {
          toast({ title: 'Error', description: 'Failed to load transactions', variant: 'destructive' });
        });
    }
  }, [selectedClient, toast]);

  // Handle transaction selection
  const handleTransactionToggle = (transactionId: string) => {
    setSelectedTransactions(prev => 
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  // Select all transactions
  const handleSelectAll = () => {
    if (selectedTransactions.length === transactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(transactions.map(tx => tx.transaction_id));
    }
  };

  // Export to QuickBooks Online
  const handleExportToQBO = async () => {
    if (!selectedClient || selectedTransactions.length === 0) {
      toast({ title: 'Error', description: 'Please select client and transactions', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const uploadId = transactions[0]?.upload_id;
      if (!uploadId) {
        toast({ title: 'Error', description: 'No upload ID found for selected transactions', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const result = await exportAPI.exportToQBO({
        client_id: selectedClient._id,
        upload_id: uploadId,
        transaction_ids: selectedTransactions
      });

      setExportResult(result.data);
      toast({
        title: 'Export Successful',
        description: `Exported ${result.data.exported_count} transactions to QuickBooks Online`
      });
    } catch (err: any) {
      toast({
        title: 'Export Failed',
        description: err.response?.data?.error || 'Failed to export to QuickBooks Online',
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  // Export to QuickBooks Desktop (IIF)
  const handleExportToQBD = async () => {
    if (!selectedClient || selectedTransactions.length === 0) {
      toast({ title: 'Error', description: 'Please select client and transactions', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const uploadId = transactions[0]?.upload_id;
      if (!uploadId) {
        toast({ title: 'Error', description: 'No upload ID found for selected transactions', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const result = await exportAPI.exportToQBD({
        client_id: selectedClient._id,
        upload_id: uploadId,
        transaction_ids: selectedTransactions,
        export_format: exportFormat
      });

      setExportResult(result.data);
      
      // Download the file - handle both absolute and relative URLs
      const link = document.createElement('a');
      const fileUrl = result.data.file_url;
      
      // If URL is relative, prepend the API base URL
      if (fileUrl.startsWith('/')) {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
        link.href = `${API_BASE_URL}${fileUrl}`;
      } else {
        link.href = fileUrl;
      }
      
      link.download = result.data.file_name;
      link.style.display = 'none'; // Hide the link
      document.body.appendChild(link);
      link.click();
      
      // Clean up the DOM element
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      document.body.removeChild(link);

      toast({
        title: 'Export Successful',
        description: `Generated IIF file with ${result.data.transactions_count} transactions`
      });
    } catch (err: any) {
      toast({
        title: 'Export Failed',
        description: err.response?.data?.error || 'Failed to export to QuickBooks Desktop',
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const clientWorkflow = selectedClient ? getClientWorkflow(selectedClient) : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Export Transactions</h1>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Client</CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={(value) => {
            const client = clients.find(c => c._id === value);
            setSelectedClient(client);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(client => (
                <SelectItem key={client._id} value={client._id}>
                  {client.name} ({client.account_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedClient && clientWorkflow && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={selectedClient.account_type === 'online' ? 'default' : 'secondary'}>
                  {selectedClient.account_type === 'online' ? 'QuickBooks Online' : 'QuickBooks Desktop'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Export Method: {clientWorkflow.exportMethod.toUpperCase()}</p>
                <p>Category Source: {clientWorkflow.categorySource.replace('_', ' ')}</p>
                <p>Requires COA Upload: {clientWorkflow.needsCOA ? 'Yes' : 'No'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Selection */}
      {selectedClient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Select Transactions ({transactions.length} approved)</span>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedTransactions.length === transactions.length ? 'Deselect All' : 'Select All'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                <p>No approved transactions found for this client</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTransactions.length === transactions.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(transaction => (
                    <TableRow key={transaction.transaction_id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTransactions.includes(transaction.transaction_id)}
                          onCheckedChange={() => handleTransactionToggle(transaction.transaction_id)}
                        />
                      </TableCell>
                      <TableCell>{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                      <TableCell>{transaction.vendor_name}</TableCell>
                      <TableCell>${Math.abs(transaction.amount).toFixed(2)}</TableCell>
                      <TableCell>{transaction.manual_category || transaction.auto_category}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.approved ? 'default' : 'secondary'}>
                          {transaction.approved ? 'Approved' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export Options */}
      {selectedClient && selectedTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedClient.account_type === 'desktop' && (
              <div>
                <label className="block text-sm font-medium mb-2">Export Format</label>
                <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="journal_entries">Journal Entries</SelectItem>
                    <SelectItem value="bank_transactions">Bank Transactions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-4">
              {selectedClient.account_type === 'online' ? (
                <Button onClick={handleExportToQBO} disabled={loading} className="flex items-center gap-2">
                  <UploadIcon className="h-4 w-4" />
                  {loading ? 'Exporting...' : 'Export to QuickBooks Online'}
                </Button>
              ) : (
                <Button onClick={handleExportToQBD} disabled={loading} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  {loading ? 'Generating...' : 'Download IIF File'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Results */}
      {exportResult && (
        <Card>
          <CardHeader>
            <CardTitle>Export Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{exportResult.message}</p>
              {exportResult.exported_count !== undefined && (
                <p>Exported: {exportResult.exported_count} transactions</p>
              )}
              {exportResult.failed_count !== undefined && (
                <p>Failed: {exportResult.failed_count} transactions</p>
              )}
              {exportResult.transactions_count !== undefined && (
                <p>Total: {exportResult.transactions_count} transactions</p>
              )}
              {exportResult.file_name && (
                <p>File: {exportResult.file_name}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Export;
