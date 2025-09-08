import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { quickbooksAPI } from '@/lib/api'; // <-- Use your API wrapper

interface CoAAccount {
  id: string;
  name: string;
  number: string;
  type: string;
  subType: string | null;
  active: boolean;
}

interface RegisterAccount {
  id: string;
  name: string;
  type: string;
}

interface QBOStatus {
  connected: boolean;
  realmId?: string;
  token_expires_at?: string;
  has_access_token?: boolean;
  has_refresh_token?: boolean;
}

export const ClientQuickBooksTab: React.FC<{ clientId: string }> = ({ clientId }) => {
  const { toast } = useToast();
  const [keys, setKeys] = useState({ qb_client_id: '', qb_client_secret: '' });
  const [status, setStatus] = useState<QBOStatus | null>(null);
  const [accounts, setAccounts] = useState<CoAAccount[]>([]);
  const [registers, setRegisters] = useState<RegisterAccount[]>([]);
  const [selectedRegister, setSelectedRegister] = useState<string>('');
  const [loadingCoA, setLoadingCoA] = useState(false);
  const [loadingRegs, setLoadingRegs] = useState(false);

  // Save keys
  const handleSaveKeys = async () => {
    await quickbooksAPI.saveKeys(clientId, keys);
    toast({ title: 'Keys saved' });
    fetchStatus();
  };

  // Connect
  const handleConnect = () => {
    quickbooksAPI.connect(clientId);
    const t = setInterval(async () => {
      const r = await quickbooksAPI.getStatus(clientId).then(res => res.data);
      if (r.connected) {
        clearInterval(t);
        setStatus(r);
        toast({ title: 'QuickBooks Connected' });
      }
    }, 2000);
  };

  // Disconnect
  const handleDisconnect = async () => {
    await quickbooksAPI.disconnect(clientId);
    setStatus({ connected: false });
    toast({ title: 'Disconnected from QuickBooks' });
  };

  // Load CoA
  const handleLoadCoA = async () => {
    setLoadingCoA(true);
    const coa = await quickbooksAPI.getAccounts(clientId).then(res => res.data);
    setAccounts(coa);
    setLoadingCoA(false);
  };

  // Load Register Accounts
  const handleLoadRegisters = async () => {
    setLoadingRegs(true);
    const regs = await quickbooksAPI.getRegisterAccounts(clientId).then(res => res.data);
    setRegisters(regs);
    setLoadingRegs(false);
  };

  // Set Register for Upload (call this after selecting an upload and a register)
  const handleSetRegister = async (uploadId: string, regId: string, regType: string) => {
    await quickbooksAPI.setRegister(clientId, uploadId, {
      qbo_register_account_id: regId,
      qbo_register_account_type: regType,
    });
    toast({ title: 'Register account set for upload' });
  };

  // Fetch status on mount
  const fetchStatus = () => {
    quickbooksAPI.getStatus(clientId).then(res => setStatus(res.data));
  };
  useEffect(() => { fetchStatus(); }, [clientId]);

  // Helper for relative time
  const relativeTime = (iso: string) => {
    if (!iso) return '';
    const diff = (new Date(iso).getTime() - Date.now()) / 1000;
    if (diff < 60) return `in ${Math.round(diff)}s`;
    if (diff < 3600) return `in ${Math.round(diff / 60)}m`;
    if (diff < 86400) return `in ${Math.round(diff / 3600)}h`;
    return `in ${Math.round(diff / 86400)}d`;
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>QuickBooks Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <Input
              placeholder="QuickBooks Client ID"
              value={keys.qb_client_id}
              onChange={e => setKeys(k => ({ ...k, qb_client_id: e.target.value }))}
              className="w-64"
            />
            <Input
              placeholder="QuickBooks Client Secret"
              value={keys.qb_client_secret}
              onChange={e => setKeys(k => ({ ...k, qb_client_secret: e.target.value }))}
              type="password"
              className="w-64"
            />
            <Button onClick={handleSaveKeys}>Save Keys</Button>
          </div>
          <div className="mt-4 flex items-center gap-4">
            {status?.connected ? (
              <>
                <Badge className="bg-success">Connected</Badge>
                <span>Realm ID: <b>{status.realmId}</b></span>
                <span>
                  Token expires: <b>{status.token_expires_at ? relativeTime(status.token_expires_at) : '-'}</b>
                </span>
                <Button variant="outline" onClick={handleDisconnect}>Disconnect</Button>
              </>
            ) : (
              <Button onClick={handleConnect}>Connect to QuickBooks</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart of Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Chart of Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLoadCoA} disabled={loadingCoA}>
            {loadingCoA ? 'Loading...' : 'Load CoA'}
          </Button>
          <div style={{ maxHeight: 300, overflow: 'auto', marginTop: 16 }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>{a.name}</TableCell>
                    <TableCell>{a.number}</TableCell>
                    <TableCell>{a.type}</TableCell>
                    <TableCell>{a.active ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Register Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Register Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLoadRegisters} disabled={loadingRegs}>
            {loadingRegs ? 'Loading...' : 'Load Register Accounts'}
          </Button>
          <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 16 }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registers.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.type}</TableCell>
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