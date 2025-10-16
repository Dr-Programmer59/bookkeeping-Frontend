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
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [uploadsSearch, setUploadsSearch] = useState('');
  const [syncSearch, setSyncSearch] = useState('');
  const [uploads, setUploads] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Try new unified dashboard API first, fallback to legacy APIs
        try {
          const dashboardRes = await dashboardAPI.getDashboard();
          setDashboardData(dashboardRes.data);
          setUploads(dashboardRes.data.recent_uploads || []);
        } catch (dashboardErr) {
          console.warn('Unified dashboard API not available, falling back to legacy endpoints');
          // Fallback to legacy endpoints
          const [uploadsRes, pendingRes, syncRes] = await Promise.all([
            dashboardAPI.getUploads(),
            dashboardAPI.getPendingApprovals(),
            dashboardAPI.getSyncHistory(),
          ]);
          setUploads(uploadsRes.data);
          setPendingApprovals(pendingRes.data);
          setSyncHistory(syncRes.data);
        }
      } catch (err: any) {
        console.error('Dashboard fetch error:', err);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive'
        });
      }
      setLoading(false);
    };
    fetchData();
  }, [toast]);

  // Filtered data for search
  const filteredUploads = uploads.filter(upload => {
    const clientName = typeof upload.client === 'string' ? upload.client : upload.client?.name || upload.client_name || '';
    const uploadedBy = typeof upload.uploaded_by === 'string' ? upload.uploaded_by : '';
    return clientName.toLowerCase().includes(uploadsSearch.toLowerCase()) ||
           uploadedBy.toLowerCase().includes(uploadsSearch.toLowerCase());
  });

  const filteredSyncHistory = syncHistory.filter(sync => {
    const clientName = typeof sync.client === 'string' ? sync.client : sync.client?.name || sync.client_name || '';
    return clientName.toLowerCase().includes(syncSearch.toLowerCase());
  });

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
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <UserManagement/>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg mt-2">Monitor uploads, approvals, and sync status</p>
      </div>

      {/* Uploads Section */}
      <Card className="mobile-card hover-glow">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <span>Recent Uploads</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Search by client or uploader..."
              value={uploadsSearch}
              onChange={e => setUploadsSearch(e.target.value)}
              className="mobile-input max-w-sm"
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Upload ID</TableHead>
                  <TableHead className="min-w-[100px]">Client</TableHead>
                  <TableHead className="hidden sm:table-cell min-w-[120px]">Uploaded By</TableHead>
                  <TableHead className="min-w-[100px]">Date</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[100px]">Transactions</TableHead>
                  <TableHead className="min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUploads.map(upload => (
                  <TableRow key={upload.upload_id || upload.id} className="hover:bg-muted/50 transition-colors duration-200">
                    <TableCell className="font-mono text-xs sm:text-sm">{upload.upload_id || upload.id}</TableCell>
                    <TableCell className="font-medium">{upload.client?.name || upload.client || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{upload.uploaded_by?.email || upload.uploaded_by || '-'}</TableCell>
                    <TableCell className="text-sm">{upload.upload_timestamp ? new Date(upload.upload_timestamp).toLocaleDateString() : upload.date}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(upload.status)}>{upload.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{upload.transactionCount || upload.transaction_count || '-'}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => navigate(`/transactions?upload_id=${upload.upload_id || upload.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pending Approvals Section */}
      <Card className="mobile-card hover-glow">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <div className="w-1 h-6 bg-warning rounded-full"></div>
            <span>Pending Approvals</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Upload ID</TableHead>
                  <TableHead className="min-w-[100px]">Client</TableHead>
                  <TableHead className="min-w-[100px]">Transactions</TableHead>
                  <TableHead className="min-w-[80px]">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.map(pa => (
                  <TableRow key={pa.uploadId || pa.upload_id} className="hover:bg-muted/50 transition-colors duration-200">
                    <TableCell className="font-mono text-xs sm:text-sm">{pa.uploadId || pa.upload_id}</TableCell>
                    <TableCell className="font-medium">{pa.client?.name || pa.client || '-'}</TableCell>
                    <TableCell>{pa.transactionCount || pa.transaction_count || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {pa.pendingCount || pa.pending_count || '-'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Sync History Section */}
      <Card className="mobile-card hover-glow">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
          <CardTitle className="flex items-center space-x-2">
            <div className="w-1 h-6 bg-success rounded-full"></div>
            <span>Sync History</span>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Search by client..."
              value={syncSearch}
              onChange={e => setSyncSearch(e.target.value)}
              className="mobile-input max-w-sm"
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Upload ID</TableHead>
                  <TableHead className="min-w-[100px]">Client</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="hidden sm:table-cell min-w-[120px]">Response Code</TableHead>
                  <TableHead className="min-w-[100px]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSyncHistory.map(sync => (
                  <TableRow key={sync.uploadId || sync.upload_id} className="hover:bg-muted/50 transition-colors duration-200">
                    <TableCell className="font-mono text-xs sm:text-sm">{sync.uploadId || sync.upload_id}</TableCell>
                    <TableCell className="font-medium">{sync.client?.name || sync.client || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(sync.status)}>{sync.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs">{sync.responseCode || sync.response_code || '-'}</TableCell>
                    <TableCell className="text-sm">{sync.date ? new Date(sync.date).toLocaleDateString() : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};