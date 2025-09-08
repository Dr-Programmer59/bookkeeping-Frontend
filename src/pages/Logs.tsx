import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Eye, RotateCcw, Search, Filter, Download } from 'lucide-react';
import { format } from 'date-fns';

interface LogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: string;
  details: string;
  canRollback: boolean;
}

const mockLogs: LogEntry[] = [
  { id: '1', userId: '1', userName: 'Admin User', action: 'Transaction Approved', targetType: 'Transaction', targetId: 'TXN-001', timestamp: '2024-01-15 14:30:25', details: 'Approved transaction: Office Supply Store - $245.99', canRollback: true },
  { id: '2', userId: '1', userName: 'Admin User', action: 'Category Changed', targetType: 'Transaction', targetId: 'TXN-002', timestamp: '2024-01-15 14:28:15', details: 'Changed category from "Miscellaneous" to "Software & Technology"', canRollback: true },
  { id: '3', userId: '1', userName: 'Admin User', action: 'Rule Created', targetType: 'Rule', targetId: 'RULE-001', timestamp: '2024-01-15 14:25:10', details: 'Created rule: Vendor contains "Office Supply" → Office Supplies', canRollback: false },
  { id: '4', userId: '2', userName: 'Worker User', action: 'File Uploaded', targetType: 'Upload', targetId: 'UPL-001', timestamp: '2024-01-15 13:45:30', details: 'Uploaded file: acme_statement_jan.pdf (2.3 MB)', canRollback: false },
  { id: '5', userId: '1', userName: 'Admin User', action: 'QuickBooks Sync', targetType: 'Sync', targetId: 'SYNC-001', timestamp: '2024-01-15 13:30:20', details: 'Synced 15 transactions to QuickBooks successfully', canRollback: false },
  { id: '6', userId: '1', userName: 'Admin User', action: 'Transaction Edited', targetType: 'Transaction', targetId: 'TXN-003', timestamp: '2024-01-15 12:15:45', details: 'Edited vendor name from "Unknown ABC" to "ABC Services Inc"', canRollback: true },
];

const actionTypes = ['All Actions', 'Transaction Approved', 'Category Changed', 'Rule Created', 'File Uploaded', 'QuickBooks Sync', 'Transaction Edited'];
const targetTypes = ['All Types', 'Transaction', 'Rule', 'Upload', 'Sync'];

export const Logs = () => {
  const { toast } = useToast();
  const [logs] = useState<LogEntry[]>(mockLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('All Actions');
  const [selectedTargetType, setSelectedTargetType] = useState('All Types');
  const [selectedUser, setSelectedUser] = useState('All Users');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const users = ['All Users', ...Array.from(new Set(logs.map(log => log.userName)))];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = selectedAction === 'All Actions' || log.action === selectedAction;
    const matchesTargetType = selectedTargetType === 'All Types' || log.targetType === selectedTargetType;
    const matchesUser = selectedUser === 'All Users' || log.userName === selectedUser;
    const matchesDate = !selectedDate || log.timestamp.startsWith(format(selectedDate, 'yyyy-MM-dd'));

    return matchesSearch && matchesAction && matchesTargetType && matchesUser && matchesDate;
  });

  const handleRollback = (logId: string) => {
    toast({
      title: "Rollback initiated",
      description: "The action has been successfully rolled back.",
    });
  };

  const handleViewHistory = (log: LogEntry) => {
    setSelectedLog(log);
  };

  const handleExportLogs = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Timestamp,User,Action,Target Type,Target ID,Details\n" +
      filteredLogs.map(log => 
        `"${log.timestamp}","${log.userName}","${log.action}","${log.targetType}","${log.targetId}","${log.details}"`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export complete",
      description: "Audit logs have been exported to CSV file.",
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Transaction Approved':
      case 'QuickBooks Sync':
        return 'bg-success text-success-foreground';
      case 'Category Changed':
      case 'Transaction Edited':
        return 'bg-warning text-warning-foreground';
      case 'Rule Created':
        return 'bg-primary text-primary-foreground';
      case 'File Uploaded':
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="space-y-4 md:space-y-8 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Logging & Audit Trail</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Track all system activities and maintain complete audit history
          </p>
        </div>
        
        <Button onClick={handleExportLogs} variant="outline" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rollback Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {logs.filter(log => log.canRollback).length}
            </div>
            <p className="text-xs text-muted-foreground">Actions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.length - 1}
            </div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sync Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {logs.filter(log => log.action === 'QuickBooks Sync').length}
            </div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search - Full width on mobile */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filter grid - responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Action type" />
                </SelectTrigger>
                <SelectContent>
                  {actionTypes.map(action => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedTargetType} onValueChange={setSelectedTargetType}>
                <SelectTrigger>
                  <SelectValue placeholder="Target type" />
                </SelectTrigger>
                <SelectContent>
                  {targetTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="User" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user} value={user}>
                      {user}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start w-full">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'Select date'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log Entries ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Timestamp</TableHead>
                  <TableHead className="min-w-[100px]">User</TableHead>
                  <TableHead className="min-w-[120px]">Action</TableHead>
                  <TableHead className="hidden sm:table-cell min-w-[100px]">Target Type</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[100px]">Target ID</TableHead>
                  <TableHead className="min-w-[200px]">Details</TableHead>
                  <TableHead className="min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs sm:text-sm p-2 sm:p-4">
                      <div className="space-y-1">
                        <div>{log.timestamp.split(' ')[0]}</div>
                        <div className="text-muted-foreground text-xs">
                          {log.timestamp.split(' ')[1]}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="p-2 sm:p-4">
                      <div className="text-sm">{log.userName}</div>
                    </TableCell>
                    
                    <TableCell className="p-2 sm:p-4">
                      <Badge className={`${getActionColor(log.action)} text-xs`}>
                        <span className="hidden sm:inline">{log.action}</span>
                        <span className="sm:hidden">
                          {log.action.split(' ')[0]}
                        </span>
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="hidden sm:table-cell p-2 sm:p-4">
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        {log.targetType}
                      </code>
                    </TableCell>
                    
                    <TableCell className="hidden md:table-cell font-mono text-xs p-2 sm:p-4">
                      {log.targetId}
                    </TableCell>
                    
                    <TableCell className="p-2 sm:p-4">
                      <div className="max-w-[200px] sm:max-w-xs">
                        <div className="truncate text-sm" title={log.details}>
                          {log.details}
                        </div>
                        {/* Show more details on mobile */}
                        <div className="sm:hidden mt-1 space-y-1 text-xs text-muted-foreground">
                          <div>{log.targetType}: {log.targetId}</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="p-2 sm:p-4">
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewHistory(log)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        
                        {log.canRollback && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRollback(log.id)}
                            className="text-warning hover:text-warning h-8 w-8 p-0"
                          >
                            <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <DialogHeader>
            <DialogTitle>Log Entry Details</DialogTitle>
            <DialogDescription>
              Complete information about this audit log entry
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Timestamp</Label>
                  <p className="font-mono text-sm">{selectedLog.timestamp}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">User</Label>
                  <p className="text-sm">{selectedLog.userName} ({selectedLog.userId})</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Action</Label>
                  <Badge className={getActionColor(selectedLog.action)}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Target</Label>
                  <p className="text-sm">{selectedLog.targetType}: {selectedLog.targetId}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Details</Label>
                <p className="text-sm bg-muted p-3 rounded-lg mt-1">
                  {selectedLog.details}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Rollback {selectedLog.canRollback ? 'available' : 'not available'}
                </div>
                {selectedLog.canRollback && (
                  <Button 
                    variant="outline" 
                    onClick={() => handleRollback(selectedLog.id)}
                    className="text-warning w-full sm:w-auto"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Rollback Action
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};