import { useState, useEffect } from 'react';
import { dashboardAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle, AlertCircle, Download, Eye, Trash2, RotateCcw } from 'lucide-react';
import { UserManagement } from '@/components/UserManagement';

interface Upload {
  id: string;
  client: string;
  uploadedBy: string;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  transactionCount: number;
}

interface PendingApproval {
  uploadId: string;
  client: string;
  transactionCount: number;
  pendingCount: number;
}

interface SyncHistory {
  uploadId: string;
  client: string;
  status: 'success' | 'failed';
  responseCode: string;
  date: string;
}


export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [uploadsSearch, setUploadsSearch] = useState('');
  const [syncSearch, setSyncSearch] = useState('');
  const [uploads, setUploads] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [uploadsRes, pendingRes, syncRes] = await Promise.all([
          dashboardAPI.getUploads(),
          dashboardAPI.getPendingApprovals(),
          dashboardAPI.getSyncHistory(),
        ]);
        setUploads(uploadsRes.data);
        setPendingApprovals(pendingRes.data);
        setSyncHistory(syncRes.data);
      } catch (err) {
        // handle error, optionally show toast
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Filtered data for search
  const filteredUploads = uploads.filter(upload =>
    upload.client?.toLowerCase().includes(uploadsSearch.toLowerCase()) ||
    upload.uploaded_by?.toLowerCase().includes(uploadsSearch.toLowerCase())
  );

  const filteredSyncHistory = syncHistory.filter(sync =>
    sync.client?.toLowerCase().includes(syncSearch.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return 'bg-success text-success-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      case 'failed':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted';
    }
  };

  const handleExportCSV = () => {
    // Simulate CSV export
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Upload ID,Client,Status,Response Code,Date\n" +
      filteredSyncHistory.map(row => 
        `${row.uploadId},${row.client},${row.status},${row.responseCode},${row.date}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sync_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <UserManagement/>

      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Monitor uploads, approvals, and sync status</p>
      </div>

      {/* Uploads Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by client or uploader..."
            value={uploadsSearch}
            onChange={e => setUploadsSearch(e.target.value)}
            className="mb-4 w-64"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Upload ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUploads.map(upload => (
                <TableRow key={upload.upload_id || upload.id}>
                  <TableCell>{upload.upload_id || upload.id}</TableCell>
                  <TableCell>{upload.client?.name || upload.client || '-'}</TableCell>
                  <TableCell>{upload.uploaded_by?.email || upload.uploaded_by || '-'}</TableCell>
                  <TableCell>{upload.upload_timestamp ? new Date(upload.upload_timestamp).toLocaleDateString() : upload.date}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(upload.status)}>{upload.status}</Badge>
                  </TableCell>
                  <TableCell>{upload.transactionCount || upload.transaction_count || '-'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/transactions?upload_id=${upload.upload_id || upload.id}`)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Approvals Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Upload ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingApprovals.map(pa => (
                <TableRow key={pa.uploadId || pa.upload_id}>
                  <TableCell>{pa.uploadId || pa.upload_id}</TableCell>
                  <TableCell>{pa.client?.name || pa.client || '-'}</TableCell>
                  <TableCell>{pa.transactionCount || pa.transaction_count || '-'}</TableCell>
                  <TableCell>{pa.pendingCount || pa.pending_count || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sync History Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sync History</CardTitle>
          <Button size="sm" variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by client..."
            value={syncSearch}
            onChange={e => setSyncSearch(e.target.value)}
            className="mb-4 w-64"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Upload ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response Code</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSyncHistory.map(sync => (
                <TableRow key={sync.uploadId || sync.upload_id}>
                  <TableCell>{sync.uploadId || sync.upload_id}</TableCell>
                  <TableCell>{sync.client?.name || sync.client || '-'}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(sync.status)}>{sync.status}</Badge>
                  </TableCell>
                  <TableCell>{sync.responseCode || sync.response_code || '-'}</TableCell>
                  <TableCell>{sync.date ? new Date(sync.date).toLocaleDateString() : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};