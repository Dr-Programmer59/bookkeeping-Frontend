import React, { useEffect, useState } from 'react';
import { clientsAPI, coaAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { ClientQuickBooksTab } from './ClientQuickBooksTab';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

const Clients: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [form, setForm] = useState({ 
    name: '', 
    client_number: '', 
    account_type: 'online',
    qb_client_id: '', 
    qb_client_secret: '' 
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQboClientId, setShowQboClientId] = useState<string | null>(null);
  
  // COA Upload Modal State
  const [showCoaModal, setShowCoaModal] = useState(false);
  const [coaFile, setCoaFile] = useState<File | null>(null);
  const [coaPreview, setCoaPreview] = useState<any[]>([]);
  const [pendingClient, setPendingClient] = useState<any>(null);
  const [coaUploading, setCoaUploading] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await clientsAPI.getClients();
      setClients(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch clients');
    }
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAccountTypeChange = (value: string) => {
    setForm({ ...form, account_type: value });
  };

  const handleCoaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setCoaFile(file);
      if (file.type === 'text/csv') {
        parseCoaPreview(file);
      } else {
        // For Excel files, show basic info
        setCoaPreview([
          ['File Type', 'Excel Spreadsheet'],
          ['File Size', `${(file.size / 1024).toFixed(1)} KB`],
          ['Note', 'Preview will be available after upload']
        ]);
      }
    } else {
      toast({
        title: 'Invalid file type',
        description: 'Please select a CSV or Excel file',
        variant: 'destructive'
      });
    }
  };

  const parseCoaPreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').slice(0, 6); // First 5 rows + header
      const preview = lines.map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')));
      setCoaPreview(preview);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const clientData = {
        name: form.name,
        client_number: parseInt(form.client_number),
        account_type: form.account_type,
        ...(form.account_type === 'online' && {
          qb_client_id: form.qb_client_id,
          qb_client_secret: form.qb_client_secret
        })
      };

      if (editingId) {
        await clientsAPI.updateClient(editingId, clientData);
        toast({ title: 'Client updated successfully' });
      } else {
        const clientResponse = await clientsAPI.createClient(clientData);
        const newClient = clientResponse.data;
        
        // For Desktop clients, show COA modal after creation
        if (form.account_type === 'desktop') {
          setPendingClient(newClient);
          setShowCoaModal(true);
          toast({ title: 'Client created successfully', description: 'Now upload Chart of Accounts' });
        } else {
          toast({ title: 'Client created successfully' });
        }
      }
      
      setForm({ name: '', client_number: '', account_type: 'online', qb_client_id: '', qb_client_secret: '' });
      setEditingId(null);
      fetchClients();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error saving client');
    }
  };

  const handleCoaImport = async () => {
    if (!pendingClient || !coaFile) return;
    
    setCoaUploading(true);
    try {
      // Upload COA for the already created client
      const coaResponse = await coaAPI.uploadCOA(pendingClient._id, coaFile);
      const coaResult = coaResponse.data;
      
      toast({ 
        title: 'COA uploaded successfully',
        description: `COA uploaded with ${coaResult.accounts_count} accounts`
      });
      
      // Reset form and close modal
      setForm({ name: '', client_number: '', account_type: 'online', qb_client_id: '', qb_client_secret: '' });
      setPendingClient(null);
      setShowCoaModal(false);
      setCoaFile(null);
      setCoaPreview([]);
      fetchClients();
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error uploading COA');
      toast({
        title: 'Error',
        description: 'Failed to upload COA',
        variant: 'destructive'
      });
    } finally {
      setCoaUploading(false);
    }
  };

  const handleEdit = (client: any) => {
    setForm({
      name: client.name,
      client_number: client.client_number?.toString() || '',
      account_type: client.account_type || 'online',
      qb_client_id: client.qb_client_id || '',
      qb_client_secret: client.qb_client_secret || '',
    });
    setEditingId(client._id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this client?')) return;
    try {
      await clientsAPI.deleteClient(id);
      fetchClients();
      toast({ title: 'Client deleted successfully' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error deleting client');
    }
  };

  const handleCoaUpload = async (clientId: string) => {
    // For existing desktop clients, open COA upload modal
    const client = clients.find(c => c._id === clientId);
    if (client) {
      setPendingClient({ ...client, isExisting: true });
      setShowCoaModal(true);
    }
  };

  const getAccountTypeBadge = (accountType: string) => {
    return accountType === 'online' ? (
      <Badge variant="default" className="bg-blue-100 text-blue-800">
        Online
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-800">
        Desktop
      </Badge>
    );
  };

  const getCoaStatusBadge = (client: any) => {
    if (client.account_type !== 'desktop') return null;
    
    return client.coa_active_version ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        COA Active
      </Badge>
    ) : (
      <Badge variant="destructive" className="bg-red-100 text-red-800">
        <AlertCircle className="w-3 h-3 mr-1" />
        No COA
      </Badge>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold">Clients</h2>
      </div>

      {/* Add/Edit Client Form */}
      <div className="bg-white rounded-lg border p-4 md:p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">
          {editingId ? 'Edit Client' : 'Add New Client'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Client Name</label>
              <Input 
                name="name" 
                placeholder="Client Name" 
                value={form.name} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Client Number</label>
              <Input 
                name="client_number" 
                placeholder="Client Number" 
                value={form.client_number} 
                onChange={handleChange} 
                required 
                type="number" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">QuickBooks Type</label>
              <Select value={form.account_type} onValueChange={handleAccountTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select QuickBooks type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">QuickBooks Online</SelectItem>
                  <SelectItem value="desktop">QuickBooks Desktop</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Online-specific fields */}
          {form.account_type === 'online' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium mb-1">QuickBooks Client ID</label>
                <Input 
                  name="qb_client_id" 
                  placeholder="QBO Client ID" 
                  value={form.qb_client_id} 
                  onChange={handleChange} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">QuickBooks Client Secret</label>
                <Input 
                  name="qb_client_secret" 
                  placeholder="QBO Client Secret" 
                  value={form.qb_client_secret} 
                  onChange={handleChange} 
                  type="password" 
                />
              </div>
            </div>
          )}

          {/* Desktop info */}
          {form.account_type === 'desktop' && !editingId && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>Chart of Accounts (COA) upload will be required after creating the client</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={loading}>
              {editingId ? 'Update Client' : 'Add Client'}
            </Button>
            {editingId && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { 
                  setEditingId(null); 
                  setForm({ name: '', client_number: '', account_type: 'online', qb_client_id: '', qb_client_secret: '' }); 
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>

        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      </div>

      {/* Pending Desktop Client COA Upload */}
      {pendingClient && !showCoaModal && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Desktop client "{pendingClient.name}" needs Chart of Accounts upload
              </span>
            </div>
            <Button 
              size="sm" 
              onClick={() => setShowCoaModal(true)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Chart of Accounts
            </Button>
          </div>
        </div>
      )}

      {/* Clients Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Client #</TableHead>
                <TableHead>QB Type</TableHead>
                <TableHead>COA Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map(client => (
                <TableRow key={client._id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.client_number}</TableCell>
                  <TableCell>{getAccountTypeBadge(client.account_type || 'online')}</TableCell>
                  <TableCell>{getCoaStatusBadge(client)}</TableCell>
                  <TableCell>
                    {client.created_at ? new Date(client.created_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(client)}>
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleDelete(client._id)}
                      >
                        Delete
                      </Button>
                      {client.account_type === 'online' ? (
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={() => setShowQboClientId(client._id)}
                        >
                          QuickBooks
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={() => handleCoaUpload(client._id)}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          {client.coa_active_version ? 'Replace COA' : 'Import COA'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {loading && <div className="text-center py-4">Loading...</div>}

      {/* QuickBooks Online Modal */}
      {showQboClientId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">QuickBooks Integration</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowQboClientId(null)}
              >
                ✕
              </Button>
            </div>
            <div className="p-4">
              <ClientQuickBooksTab clientId={showQboClientId} />
            </div>
          </div>
        </div>
      )}
      
      {/* COA Upload Modal */}
      {showCoaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Upload Chart of Accounts</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCoaModal(false)}
              >
                ✕
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-600">
                Upload a CSV or Excel file containing your Chart of Accounts. 
                Required columns: Number, Name, Type
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Select COA File</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleCoaFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              
              {coaPreview.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Preview:</h4>
                  <div className="border rounded-lg p-3 max-h-40 overflow-auto bg-gray-50">
                    <div className="text-xs font-mono space-y-1">
                      {coaPreview.map((row, i) => (
                        <div key={i} className={i === 0 ? 'font-bold' : ''}>
                          {row.join(' | ')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCoaModal(false)}
                  disabled={coaUploading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCoaImport} 
                  disabled={!coaFile || coaUploading}
                  className="flex items-center"
                >
                  {coaUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import & Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;