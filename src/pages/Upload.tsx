import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { uploadAPI, clientsAPI } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload as UploadIcon, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface UploadedFile {
  upload_id: string;
  client_id: string;
  original_filename: string;
  uploaded_by: string;
  upload_timestamp: string;
  status: 'pending_parse' | 'processing' | 'completed' | 'failed';
}

// Transaction type for upload transactions
interface Transaction {
  transaction_id: string;
  upload_id: string;
  transaction_date: string;
  vendor_name: string;
  amount: number;
  payment_type: string;
  transaction_type: string;
  auto_category: string;
  manual_category: string | null;
  approved: boolean;
  created_at: string;
  updated_at: string;
}

// Add this interface at the top:
interface UploadProps {
  onUploadSuccess?: (uploadId: string) => void;
}

// Update your component definition:
export const Upload: React.FC<UploadProps> = ({ onUploadSuccess }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedClient, setDetectedClient] = useState<string>('');
  const [manualClient, setManualClient] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [clientMatches, setClientMatches] = useState<string[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // API hooks
  const {
    data: uploadsData,
    loading: uploadsLoading,
    execute: fetchUploads
  } = useApi(uploadAPI.getUploads);

  const {
    loading: uploadLoading,
    execute: uploadFile
  } = useApi(uploadAPI.upload, {
    showSuccessToast: true,
    successMessage: 'File uploaded successfully'
  });

  // Fetch uploads and clients on component mount
  useEffect(() => {
    fetchUploads();
    clientsAPI.getClients().then(res => setClients(res.data));
  }, []);

  // Update uploads when API data changes
  useEffect(() => {
    if (uploadsData) {
      setUploads(uploadsData);
    }
  }, [uploadsData]);

  const detectClientFromFilename = (filename: string): string => {
    const lowerName = filename.toLowerCase();
    const detected = clients.find((client: any) => 
      lowerName.includes(client.name.toLowerCase().split(' ')[0])
    );
    return detected ? detected.name : '';
  };

  const validateFile = (file: File): string => {
    if (file.type !== 'application/pdf') {
      return 'File must be PDF format only.';
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB
      return 'File must be under 10MB.';
    }
    return '';
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelection = (file: File) => {
    setError('');
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    const detected = detectClientFromFilename(file.name);
    setDetectedClient(detected);
    if (!detected) {
      setError('Could not parse client name. Please select manually.');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError('');
    try {
      // Always resolve the clientId from the selected/detected client
      let clientId = '';
      if (detectedClient) {
        const found = clients.find((c: any) => c.name === detectedClient);
        if (found) clientId = found._id;
      } else if (manualClient) {
        const found = clients.find((c: any) => c.name === manualClient);
        if (found) clientId = found._id;
      }

      if (!clientId) {
        setError('Please select a client.');
        setUploading(false);
        return;
      }

      // Pass clientId to the upload API
      const response = await uploadAPI.upload(selectedFile, clientId);
      const data = response.data;
      console.log("data",data)
      if (data.client_matches && Array.isArray(data.client_matches)) {
        setClientMatches(data.client_matches);
        setError(data.message || 'Multiple client matches found. Please select manually.');
        setTransactions([]);
      } else if (data.upload_id) {
        // Fetch transactions for this upload
        console.log("chekcing in trasaction")
        const txRes = await import('@/lib/api').then(m => m.transactionAPI.getTransactions(data.upload_id));
        console.log("trascation ",txRes)
        setTransactions(txRes.data);
        toast({ title: 'Upload successful', description: `Fetched ${txRes.data.length} transactions.` });
        setError('');
        setClientMatches([]);
        setSelectedFile(null);
        setDetectedClient('');
        setManualClient('');
        await fetchUploads();
        if (onUploadSuccess) onUploadSuccess(data.upload_id);
      } else {
        setError('Unexpected upload response.');
        setTransactions([]);
      }
    } catch (error) {
      console.log(error)
      setError('Upload failed. Please try again.');
      setTransactions([]);
    } finally {
      setUploading(false);
    }
  };
          {/* Show transactions after upload */}
          {transactions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Transactions for this upload:</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Auto Category</TableHead>
                    <TableHead>Manual Category</TableHead>
                    <TableHead>Approved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(tx => (
                    <TableRow key={tx.transaction_id}>
                      <TableCell>{tx.transaction_date}</TableCell>
                      <TableCell>{tx.vendor_name}</TableCell>
                      <TableCell>{tx.amount}</TableCell>
                      <TableCell>{tx.auto_category}</TableCell>
                      <TableCell>{tx.manual_category || '-'}</TableCell>
                      <TableCell>{tx.approved ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'pending_parse':
        return 'bg-secondary text-secondary-foreground';
      case 'processing':
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
      case 'pending_parse':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* If client not detected, show select */}
      {!detectedClient && clients.length > 0 && (
        <div className="mb-4">
          <Label>Select Client</Label>
          <Select value={manualClient} onValueChange={setManualClient}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client: any) => (
                <SelectItem key={client._id} value={client.name}>{client.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {user?.role === 'admin' ? 'Upload Client Statement' : 'Upload Files'}
        </h1>
        <p className="text-muted-foreground">
          {user?.role === 'admin' 
            ? 'Upload PDF statements for AI parsing and categorization'
            : 'Upload your assigned files for processing'
          }
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drag and Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="mx-auto flex flex-col items-center space-y-4">
              <div className="rounded-full bg-primary/10 p-6">
                <UploadIcon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {dragActive ? 'Drop your file here' : 'Drag and drop your PDF file here'}
                </p>
                <p className="text-sm text-muted-foreground">or</p>
              </div>
              <div>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('file-upload');
                    if (input) (input as HTMLInputElement).click();
                  }}
                >
                  Browse Files
                </Button>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileInput}
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                PDF files only, max 10MB
              </p>
            </div>
          </div>

          {/* Error Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* File Preview and Client Selection */}
          {selectedFile && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div>
                <Label className="text-sm font-medium">Selected File:</Label>
                <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
              </div>

              {/* Client Auto-Match or Manual Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Client:</Label>
                {detectedClient ? (
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-success/10 text-success">
                      Auto-detected: {detectedClient}
                    </Badge>
                    {user?.role === 'admin' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDetectedClient('');
                          setError('Client auto-detection overridden. Please select manually.');
                        }}
                      >
                        Override
                      </Button>
                    )}
                  </div>
                ) : (
                  user?.role === 'admin' && (
                    <Select value={manualClient} onValueChange={setManualClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client manually" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client: any) => (
                          <SelectItem key={client._id} value={client.name}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                )}
              </div>

              <Button
                onClick={handleUpload}
                disabled={
                  uploading || uploadLoading ||
                  (user?.role === 'admin' ? (!detectedClient && !manualClient) : !selectedFile)
                }
                className="w-full"
              >
                {(uploading || uploadLoading) ? 'Uploading...' : 'Upload File'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle>
            {user?.role === 'admin' ? 'Upload History' : 'My Uploads'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Client</TableHead>
                {user?.role === 'admin' && <TableHead>Uploaded By</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((upload) => (
                <TableRow key={upload.upload_id}>
                  <TableCell className="font-medium">{upload.original_filename}</TableCell>
                  <TableCell>
                    {upload.client_id == null
                      ? '-'
                      : (typeof upload.client_id === 'object' && !Array.isArray(upload.client_id))
                        ? ((upload.client_id as any).name || (upload.client_id as any)._id || JSON.stringify(upload.client_id))
                        : upload.client_id}
                  </TableCell>
                  {user?.role === 'admin' && (
                    <TableCell>
                      {upload.uploaded_by == null
                        ? '-'
                        : (typeof upload.uploaded_by === 'object' && !Array.isArray(upload.uploaded_by))
                          ? ((upload.uploaded_by as any).email || (upload.uploaded_by as any)._id || JSON.stringify(upload.uploaded_by))
                          : upload.uploaded_by}
                    </TableCell>
                  )}
                  <TableCell>{new Date(upload.upload_timestamp).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(upload.status)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(upload.status)}
                          <span>{upload.status.replace('_', ' ')}</span>
                        </div>
                      </Badge>
                    </div>
                  </TableCell>
                  {/* Removed View Transactions button here */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};