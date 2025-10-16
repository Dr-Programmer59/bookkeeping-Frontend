import { useState, useEffect } from 'react';
import { rulesAPI, categoriesAPI, clientsAPI, quickbooksAPI, coaAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Search, RefreshCw } from 'lucide-react';

interface Rule {
  id: string;
  vendorContains: string;
  mappedCategory: string;
  createdBy: string;
  dateCreated: string;
  enabled: boolean;
  matchCount: number;
}





export const Rules = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [newRule, setNewRule] = useState({ vendorContains: '', mappedCategory: '' });
  const [loading, setLoading] = useState(true);

  // Load clients on component mount
  useEffect(() => {
    setLoading(true);
    clientsAPI.getClients()
      .then(res => {
        setClients(res.data);
        // Auto-select first client if available
        if (res.data.length > 0) {
          setSelectedClient(res.data[0]);
        }
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to load clients', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  // Load rules and categories when client is selected
  useEffect(() => {
    if (!selectedClient) {
      setRules([]);
      setCategories([]);
      return;
    }

    // Load rules for selected client
    rulesAPI.getRules(selectedClient._id)
      .then(res => {
        setRules(res.data.map((r: any) => ({
          id: r.rule_id,
          vendorContains: r.vendor_contains,
          mappedCategory: r.map_to_account,
          createdBy: r.created_by,
          dateCreated: r.created_at.split('T')[0],
          enabled: r.active,
          matchCount: r.match_count ?? 0
        })));
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to load rules', variant: 'destructive' }));

    // Load categories/accounts based on client type
    loadCategoriesForClient(selectedClient);
  }, [selectedClient]);

  // Function to load categories based on client type
  const loadCategoriesForClient = async (client: any) => {
    setCategoriesLoading(true);
    try {
      if (client.account_type === 'online') {
        // For online clients, get accounts from QuickBooks API
        const res = await quickbooksAPI.getAccounts(client._id);
        const qbAccounts = res.data || [];
        setCategories(qbAccounts.map((account: any) => 
          account.fullName || account.name
        ));
      } else if (client.account_type === 'desktop') {
        // For desktop clients, get COA data from uploaded CSV
        const res = await coaAPI.getCOAData(client._id);
        const coaData = res.data.data || [];
        setCategories(coaData.map((account: any) => 
          account["Accnt. #"] 
            ? `${account["Accnt. #"]} - ${account.Account}` 
            : account.Account
        ));
      } else {
        // Fallback to regular categories if account type is not specified
        const res = await categoriesAPI.getCategories();
        setCategories(res.data.map((c: any) => c.name));
      }
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      toast({ 
        title: 'Error', 
        description: `Failed to load categories for ${client.account_type} client`, 
        variant: 'destructive' 
      });
      // Fallback to empty categories
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const filteredRules = rules.filter(rule => {
    const vendor = typeof rule.vendorContains === 'string' ? rule.vendorContains : '';
    const category = typeof rule.mappedCategory === 'string' ? rule.mappedCategory : '';
    return vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
           category.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleAddRule = async () => {
    if (!newRule.vendorContains || !newRule.mappedCategory || !selectedClient) {
      toast({
        title: "Invalid input",
        description: "Please fill in all fields and select a client.",
        variant: "destructive"
      });
      return;
    }
    try {
      const res = await rulesAPI.createRule({
        client_id: selectedClient._id,
        vendor_contains: newRule.vendorContains,
        map_to_account: newRule.mappedCategory
      });
      // Refetch rules after add
      rulesAPI.getRules(selectedClient._id).then(res => {
        setRules(res.data.map((r: any) => ({
          id: r.rule_id,
          vendorContains: r.vendor_contains,
          mappedCategory: r.map_to_account,
          createdBy: r.created_by,
          dateCreated: r.created_at.split('T')[0],
          enabled: r.active,
          matchCount: r.match_count ?? 0
        })));
      });
      setNewRule({ vendorContains: '', mappedCategory: '' });
      setShowAddDialog(false);
      toast({
        title: "Rule created",
        description: `New rule for \"${res.data.vendor_contains}\" has been created.`,
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to create rule', variant: 'destructive' });
    }
  };

  const handleEditRule = async () => {
    if (!editingRule) return;
    try {
      const res = await rulesAPI.updateRule(editingRule.id, {
        vendor_contains: editingRule.vendorContains,
        map_to_account: editingRule.mappedCategory,
        active: editingRule.enabled
      });
      // Refetch rules after edit
      rulesAPI.getRules(selectedClient._id).then(res => {
        setRules(res.data.map((r: any) => ({
          id: r.rule_id,
          vendorContains: r.vendor_contains,
          mappedCategory: r.map_to_account,
          createdBy: r.created_by,
          dateCreated: r.created_at.split('T')[0],
          enabled: r.active,
          matchCount: r.match_count ?? 0
        })));
      });
      setEditingRule(null);
      toast({
        title: "Rule updated",
        description: "Rule has been successfully updated.",
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to update rule', variant: 'destructive' });
    }
  };

  const handleToggleRule = async (id: string, enabled: boolean) => {
    try {
      const rule = rules.find(r => r.id === id);
      if (!rule) return;
      await rulesAPI.updateRule(id, { active: enabled });
      // Refetch rules after toggle
      rulesAPI.getRules(selectedClient._id).then(res => {
        setRules(res.data.map((r: any) => ({
          id: r.rule_id,
          vendorContains: r.vendor_contains,
          mappedCategory: r.map_to_account,
          createdBy: r.created_by,
          dateCreated: r.created_at.split('T')[0],
          enabled: r.active,
          matchCount: r.match_count ?? 0
        })));
      });
      toast({
        title: enabled ? "Rule enabled" : "Rule disabled",
        description: enabled ? "Rule is now active for future transactions." : "Rule has been disabled.",
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to update rule', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Learning & Feedback Rules</h1>
          <p className="text-muted-foreground">
            Manage categorization rules to improve AI accuracy over time
          </p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button disabled={!selectedClient}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Rule</DialogTitle>
              <DialogDescription>
                Define a pattern to automatically categorize future transactions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vendor-contains">Vendor Contains</Label>
                <Input
                  id="vendor-contains"
                  value={newRule.vendorContains}
                  onChange={(e) => setNewRule(prev => ({ ...prev, vendorContains: e.target.value }))}
                  placeholder="e.g., 'Starbucks', 'Office Depot'"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mapped-category">Map To Category</Label>
                <Select 
                  value={newRule.mappedCategory} 
                  onValueChange={(value) => setNewRule(prev => ({ ...prev, mappedCategory: value }))}
                  disabled={categoriesLoading || categories.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      categoriesLoading 
                        ? "Loading categories..." 
                        : categories.length === 0 
                          ? "No categories available" 
                          : "Select category"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClient?.account_type && (
                  <div className="text-xs text-muted-foreground">
                    Categories from {selectedClient.account_type === 'online' ? 'QuickBooks Online' : 'uploaded COA'}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddRule}>
                  Create Rule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="client-select">Client</Label>
              <Select
                value={selectedClient?._id || ''}
                onValueChange={(value) => {
                  const client = clients.find(c => c._id === value);
                  setSelectedClient(client || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{client.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {client.account_type === 'online' ? 'QuickBooks Online' : 'QuickBooks Desktop'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedClient && (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadCategoriesForClient(selectedClient)}
                  disabled={categoriesLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${categoriesLoading ? 'animate-spin' : ''}`} />
                  Refresh Categories
                </Button>
                <div className="text-xs text-muted-foreground">
                  {categoriesLoading ? 'Loading...' : `${categories.length} categories loaded`}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedClient ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No Client Selected</h3>
              <p className="text-muted-foreground">
                Please select a client above to view and manage rules.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {rules.filter(r => r.enabled).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rules.reduce((sum, rule) => sum + rule.matchCount, 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disabled Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {rules.filter(r => !r.enabled).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Categorization Rules</CardTitle>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Vendor Contains</TableHead>
                <TableHead>Mapped To</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Matches</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                      />
                      <Badge variant={rule.enabled ? "default" : "secondary"}>
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  </TableCell>
                  
                  <TableCell className="font-medium">
                    <code className="bg-muted px-2 py-1 rounded text-sm">
                      {rule.vendorContains}
                    </code>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline">{rule.mappedCategory}</Badge>
                  </TableCell>
                  
                  <TableCell>{rule.createdBy}</TableCell>
                  <TableCell>{rule.dateCreated}</TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{rule.matchCount}</span>
                      <span className="text-xs text-muted-foreground">matches</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingRule(rule)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        // onClick={() => handleDeleteRule(rule.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Rule Dialog */}
      <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Rule</DialogTitle>
            <DialogDescription>
              Modify the categorization rule details.
            </DialogDescription>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-vendor-contains">Vendor Contains</Label>
                <Input
                  id="edit-vendor-contains"
                  value={editingRule.vendorContains}
                  onChange={(e) => setEditingRule(prev => 
                    prev ? { ...prev, vendorContains: e.target.value } : null
                  )}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-mapped-category">Map To Category</Label>
                <Select 
                  value={editingRule.mappedCategory}
                  onValueChange={(value) => setEditingRule(prev =>
                    prev ? { ...prev, mappedCategory: value } : null
                  )}
                  disabled={categoriesLoading || categories.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      categoriesLoading 
                        ? "Loading categories..." 
                        : categories.length === 0 
                          ? "No categories available" 
                          : "Select category"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClient?.account_type && (
                  <div className="text-xs text-muted-foreground">
                    Categories from {selectedClient.account_type === 'online' ? 'QuickBooks Online' : 'uploaded COA'}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingRule(null)}>
                  Cancel
                </Button>
                <Button onClick={handleEditRule}>
                  Update Rule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
};