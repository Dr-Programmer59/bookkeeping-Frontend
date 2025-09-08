import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Clock, CheckCircle, AlertTriangle, Search } from 'lucide-react';

interface Upload {
  id: string;
  filename: string;
  client: string;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  size: string;
  transactionCount?: number;
  errorMessage?: string;
}

const mockUploads: Upload[] = [
  { 
    id: '1', 
    filename: 'acme_statement_jan.pdf', 
    client: 'Acme Corp', 
    date: '2024-01-15', 
    status: 'completed', 
    size: '2.3 MB',
    transactionCount: 45
  },
  { 
    id: '2', 
    filename: 'techstart_dec.pdf', 
    client: 'TechStart Inc', 
    date: '2024-01-14', 
    status: 'pending', 
    size: '1.8 MB'
  },
  { 
    id: '3', 
    filename: 'global_q4.pdf', 
    client: 'Global LLC', 
    date: '2024-01-13', 
    status: 'failed', 
    size: '4.2 MB',
    errorMessage: 'File format not recognized'
  },
  { 
    id: '4', 
    filename: 'retail_plus_nov.pdf', 
    client: 'Retail Plus', 
    date: '2024-01-12', 
    status: 'completed', 
    size: '3.1 MB',
    transactionCount: 28
  },
];

export const MyUploads = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter uploads to show only user's uploads
  const userUploads = mockUploads;
  
  const filteredUploads = userUploads.filter(upload =>
    upload.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    upload.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      case 'failed':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const completedUploads = filteredUploads.filter(u => u.status === 'completed').length;
  const pendingUploads = filteredUploads.filter(u => u.status === 'pending').length;
  const failedUploads = filteredUploads.filter(u => u.status === 'failed').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Uploads</h1>
        <p className="text-muted-foreground">
          Track the status of your uploaded files and view processing results
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredUploads.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{completedUploads}</div>
            <p className="text-xs text-muted-foreground">Successfully processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingUploads}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{failedUploads}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Uploads Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Upload History</CardTitle>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search uploads..."
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
                <TableHead>Filename</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUploads.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{upload.filename}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>{upload.client}</TableCell>
                  <TableCell>{upload.date}</TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(upload.status)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(upload.status)}
                          <span className="capitalize">{upload.status}</span>
                        </div>
                      </Badge>
                    </div>
                  </TableCell>
                  
                  <TableCell>{upload.size}</TableCell>
                  
                  <TableCell>
                    {upload.transactionCount ? (
                      <span className="text-sm font-medium">
                        {upload.transactionCount} transactions
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {upload.status === 'failed' && upload.errorMessage ? (
                      <div className="text-sm text-destructive">
                        {upload.errorMessage}
                      </div>
                    ) : upload.status === 'pending' ? (
                      <div className="text-sm text-muted-foreground">
                        Processing...
                      </div>
                    ) : upload.status === 'completed' ? (
                      <div className="text-sm text-success">
                        Ready for review
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              
              {filteredUploads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? 'No uploads match your search.' : 'No uploads found.'}
                      </p>
                      {!searchTerm && (
                        <p className="text-xs text-muted-foreground">
                          Upload your first file to get started.
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};