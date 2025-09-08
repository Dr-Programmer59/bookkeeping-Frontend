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
  const [form, setForm] = useState({ name: '', client_number: '', qb_client_id: '', qb_client_secret: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQboClientId, setShowQboClientId] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await clientsAPI.updateClient(editingId, form);
      } else {
        await clientsAPI.createClient(form);
      }
      setForm({ name: '', client_number: '', qb_client_id: '', qb_client_secret: '' });
      setEditingId(null);
      fetchClients();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error saving client');
    }
  };

  const handleEdit = (client: any) => {
    setForm({
      name: client.name,
      client_number: client.client_number,
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
        {/* QuickBooks fields */}
        <Input name="qb_client_id" placeholder="QBO Client ID" value={form.qb_client_id} onChange={handleChange} />
        <Input name="qb_client_secret" placeholder="QBO Client Secret" value={form.qb_client_secret} onChange={handleChange} type="password" />
        <Button type="submit">{editingId ? 'Update' : 'Add'} Client</Button>
        {editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm({ name: '', client_number: '', qb_client_id: '', qb_client_secret: '' }); }}>Cancel</Button>}
      </form>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {/* Add scroll area to the table section */}
      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Client Number</TableHead>
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
                <TableCell>{client.qb_client_id}</TableCell>
                <TableCell>{client.created_at ? new Date(client.created_at).toLocaleString() : '-'}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(client)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(client._id)} className="ml-2">Delete</Button>
                  <Button size="sm" variant="secondary" className="ml-2" onClick={() => setShowQboClientId(client._id)}>
                    QuickBooks
                  </Button>
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
    </div>
  );
};

export default Clients;
