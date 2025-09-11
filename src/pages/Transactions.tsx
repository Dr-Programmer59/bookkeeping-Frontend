import React, { useState, useEffect } from 'react';
import { transactionAPI, clientsAPI, categoriesAPI, quickbooksAPI } from '@/lib/api'; // <-- Add quickbooksAPI import
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export const Transactions: React.FC = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushResults, setPushResults] = useState<any | null>(null);

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
      
      // Use different API based on client type
      let res;
      if (selectedClient.account_type === 'online') {
        res = await exportAPI.pushToQBO(selectedClient._id, { pushAllApproved: true });
      } else {
        // For desktop clients, we need to export IIF instead
        toast({ title: 'Desktop Export', description: 'Use Export to QuickBooks Desktop instead', variant: 'destructive' });
        setPushLoading(false);
        return;
      }
      
      setPushResults(res.data);
      toast({
        title: 'Push Complete',
        description: `${res.data.transactions_queued} transactions queued for push`,
      });
    } catch (err: any) {
      if (err.response?.status === 401) {
        toast({ title: 'Reconnect to QuickBooks', description: 'Please reconnect and try again.', variant: 'destructive' });
      } else {
        toast({ title: 'Push Error', description: err.response?.data?.message || 'Error pushing transactions', variant: 'destructive' });
      }
    }
    setPushLoading(false);
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

  // Fetch categories on mount
  useEffect(() => {
    // For desktop clients, get COA categories; for online clients, get regular categories
    if (selectedClient?.account_type === 'desktop') {
      transactionAPI.getClientCOACategories(selectedClient._id)
        .then(res => setCategories(res.data.categories.map((cat: any) => ({ name: cat.name, _id: cat.id }))))
        .catch(() => {
          toast({ title: 'Error', description: 'Failed to load COA categories', variant: 'destructive' });
        });
    } else {
      categoriesAPI.getCategories()
        .then(res => setCategories(res.data))
        .catch(() => {
          toast({ title: 'Error', description: 'Failed to load categories', variant: 'destructive' });
        });
    }
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
      await transactionAPI.updateTransaction(transaction_id, { manual_category: category, approved: true });
      setTransactions(transactions =>
        transactions.map(tx =>
          tx.transaction_id === transaction_id
            ? { ...tx, manual_category: category, approved: true }
            : tx
        )
      );
      toast({ title: 'Category Updated', description: 'Manual category updated and approved.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.error || 'Failed to update category', variant: 'destructive' });
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
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Transactions for {selectedClient.name} <span className="text-muted-foreground text-base">({selectedClient.email})</span>
      </h1>
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
      {/* Only one Push button */}
      <div className="flex gap-2 mb-4">
        <Button onClick={handlePushAllApproved} disabled={pushLoading}>
          {pushLoading ? 'Pushing...' : 'Push to QuickBooks'}
        </Button>
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
                  // Only show transactions where approved is false
                  transactions
                    .filter(tx => !tx.approved)
                    .map(tx => (
                      <TableRow key={tx.transaction_id}>
                        <TableCell>{tx.transaction_id}</TableCell>
                        <TableCell>{tx.vendor_name}</TableCell>
                        <TableCell>{tx.amount}</TableCell>
                        <TableCell>{tx.payment_type}</TableCell>
                        <TableCell>{tx.transaction_type}</TableCell>
                        <TableCell>
                          {tx.auto_category
                            ? tx.auto_category
                            : <span className="text-warning">1480 - Ask Client</span>
                          }
                        </TableCell>
                        <TableCell>
                          {(!tx.auto_category && categories.length > 0) ? (
                            <Select
                              value={tx.manual_category || ''}
                              onValueChange={val => handleManualCategoryChange(tx.transaction_id, val)}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat: any) => (
                                  <SelectItem key={cat._id} value={cat.name}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            tx.manual_category || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={tx.approved ? 'bg-success' : 'bg-warning'}>
                            {tx.approved ? 'Yes' : 'No'}
                          </Badge>
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
    </div>
  );
};





