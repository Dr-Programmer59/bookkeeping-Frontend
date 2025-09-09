import React, { useEffect, useState } from 'react';
import { clientsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useAuth } from '../contexts/AuthContext';
import { ClientQuickBooksTab } from './ClientQuickBooksTab';
import { ScrollArea } from '@/components/ui/scroll-area'; // If you have a ScrollArea component, else use a div with overflow

const Clients: React.FC = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [form, setForm] = useState({ 
    name: '', 
    client_number: '', 
    qb_type: 'online',
    qb_client_id: '', 
    qb_client_secret: '' 
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQboClientId, setShowQboClientId] = useState<string | null>(null);
  const [showCoaModal, setShowCoaModal] = useState(false);
  const [coaFile, setCoaFile] = useState<File | null>(null);
  const [coaPreview, setCoaPreview] = useState<any[]>([]);
  const [pendingClient, setPendingClient] = useState<any>(null);

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

  const handleQbTypeChange = (value: string) => {
    setForm({ ...form, qb_type: value });
  };

  const handleCoaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCoaFile(file);
      parseCoaPreview(file);
    }
  };

  const parseCoaPreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').slice(0, 6); // First 5 rows + header
      const preview = lines.map(line => line.split(','));
      setCoaPreview(preview);
    };
    reader.readAsText(file);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (form.qb_type === 'desktop') {
      setPendingClient(form);
      setShowCoaModal(true);
      return;
    }
    
    try {
      if (editingId) {
        await clientsAPI.updateClient(editingId, form);
      } else {
        await clientsAPI.createClient(form);
      }
      setForm({ name: '', client_number: '', qb_type: 'online', qb_client_id: '', qb_client_secret: '' });
      setEditingId(null);
      fetchClients();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error saving client');
    }
  };

  const handleCoaImport = async () => {
    if (!pendingClient || !coaFile) return;
    
    try {
      const clientData = { ...pendingClient, coa_csv: coaFile.name };
      if (editingId) {
        await clientsAPI.updateClient(editingId, clientData);
      } else {
        await clientsAPI.createClient(clientData);
      }
      
      setForm({ name: '', client_number: '', qb_type: 'online', qb_client_id: '', qb_client_secret: '' });
      setEditingId(null);
      setPendingClient(null);
      setShowCoaModal(false);
      setCoaFile(null);
      setCoaPreview([]);
      fetchClients();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error saving client');
    }
  };
  const handleEdit = (client: any) => {
    setForm({
      name: client.name,
      client_number: client.client_number,
      qb_type: client.qb_type || 'online',
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error deleting client');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Clients</h2>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4 flex-wrap">
        <Input name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
        <Input name="client_number" placeholder="Client Number" value={form.client_number} onChange={handleChange} required type="number" />
        
        <select 
          value={form.qb_type} 
          onChange={(e) => handleQbTypeChange(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="online">QuickBooks Online</option>
          <option value="desktop">QuickBooks Desktop</option>
        </select>
        
        {form.qb_type === 'online' && (
          <>
            <Input name="qb_client_id" placeholder="QBO Client ID" value={form.qb_client_id} onChange={handleChange} />
            <Input name="qb_client_secret" placeholder="QBO Client Secret" value={form.qb_client_secret} onChange={handleChange} type="password" />
          </>
        )}
        
        <Button type="submit">{editingId ? 'Update' : 'Add'} Client</Button>
        {editingId && <Button type="button" variant="secondary" onClick={() => { 
          setEditingId(null); 
          setForm({ name: '', client_number: '', qb_type: 'online', qb_client_id: '', qb_client_secret: '' }); 
        }}>Cancel</Button>}
        
        {pendingClient && (
          <Button type="button" variant="outline" onClick={() => setShowCoaModal(true)}>
            Upload Chart of Accounts
          </Button>
        )}
      </form>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      
      {/* Add scroll area to the table section */}
      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Client Number</TableHead>
              <TableHead>QB Type</TableHead>
              <TableHead>QBO Client ID</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map(client => (
              <TableRow key={client._id}>
                <TableCell>{client.name}</TableCell>
                <TableCell>{client.client_number}</TableCell>
                <TableCell>{client.qb_type || 'online'}</TableCell>
                <TableCell>{client.qb_type === 'online' ? client.qb_client_id : '-'}</TableCell>
                <TableCell>{client.created_at ? new Date(client.created_at).toLocaleString() : '-'}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(client)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(client._id)} className="ml-2">Delete</Button>
                  <Button size="sm" variant="secondary" className="ml-2" onClick={() => setShowQboClientId(client._id)}>
                    QuickBooks
                  </Button>
                  {client.qb_type === 'desktop' && (
                    <Button size="sm" variant="outline" className="ml-2">Import/Replace COA</Button>
                  )}
                  {showQboClientId === client._id && (
                    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                      <div className="bg-white rounded shadow-lg p-6 max-w-2xl w-full relative">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2"
                          onClick={() => setShowQboClientId(null)}
                        >✕</Button>
                        <ClientQuickBooksTab clientId={client._id} />
                      </div>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {loading && <div>Loading...</div>}
      
      {/* COA Upload Modal */}
      {showCoaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-lg w-full relative">
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={() => setShowCoaModal(false)}
            >✕</Button>
            
            <h3 className="text-lg font-semibold mb-4">Upload Chart of Accounts (CSV)</h3>
            
            <input
              type="file"
              accept=".csv"
              onChange={handleCoaFileChange}
              className="mb-4 w-full"
            />
            
            {coaPreview.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Preview:</h4>
                <div className="border rounded p-2 max-h-32 overflow-auto text-xs">
                  {coaPreview.map((row, i) => (
                    <div key={i}>{row.join(' | ')}</div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCoaModal(false)}>Cancel</Button>
              <Button onClick={handleCoaImport} disabled={!coaFile}>Import & Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
