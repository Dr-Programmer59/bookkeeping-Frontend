import React, { useEffect, useState } from 'react';
import { categoriesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useAuth } from '../contexts/AuthContext';

const Categories: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await categoriesAPI.getCategories();
      setCategories(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch categories');
    }
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await categoriesAPI.updateCategory(editingId, form);
      } else {
        await categoriesAPI.createCategory(form);
      }
      setForm({ name: '' });
      setEditingId(null);
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error saving category');
    }
  };

  const handleEdit = (cat: any) => {
    setForm({ name: cat.name });
    setEditingId(cat._id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await categoriesAPI.deleteCategory(id);
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error deleting category');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Categories</h2>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4 flex-wrap">
        <Input name="name" placeholder="Category Name" value={form.name} onChange={handleChange} required />
        <Button type="submit">{editingId ? 'Update' : 'Add'} Category</Button>
        {editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm({ name: '' }); }}>Cancel</Button>}
      </form>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map(cat => (
            <TableRow key={cat._id}>
              <TableCell>{cat.name}</TableCell>
              <TableCell>{cat.created_by}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => handleEdit(cat)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(cat._id)} className="ml-2">Delete</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {loading && <div>Loading...</div>}
    </div>
  );
};

export default Categories;
