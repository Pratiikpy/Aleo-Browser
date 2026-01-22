import React, { useEffect, useState } from 'react';
import { Button } from '../shared/Button';

interface ConnectedSite {
  origin: string;
  permissions: string[];
  connectedAt: number;
  lastAccessedAt: number;
  address: string;
  favicon?: string;
  title?: string;
}

/**
 * Connected Sites Settings
 * Manage dApp permissions and connected sites
 */
export const ConnectedSites: React.FC = () => {
  const [sites, setSites] = useState<ConnectedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Fetch connected sites
  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const result = await window.electron.wallet.isLocked();
      if (!result.hasWallet) {
        setLoading(false);
        return;
      }

      // Get connected sites from permissions
      const response = await (window as any).electron?.permissions?.getConnectedSites?.() || { sites: [] };
      setSites(response.sites || []);
    } catch (error) {
      console.error('Failed to fetch connected sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (origin: string) => {
    setDisconnecting(origin);
    try {
      await (window as any).electron?.permissions?.disconnectSite?.(origin);
      setSites(sites.filter(site => site.origin !== origin));
    } catch (error) {
      console.error('Failed to disconnect site:', error);
    } finally {
      setDisconnecting(null);
    }
  };

  const handleDisconnectAll = async () => {
    setDisconnecting('all');
    try {
      for (const site of sites) {
        await (window as any).electron?.permissions?.disconnectSite?.(site.origin);
      }
      setSites([]);
    } catch (error) {
      console.error('Failed to disconnect all sites:', error);
    } finally {
      setDisconnecting(null);
    }
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get domain from origin
  const getDomain = (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  // Truncate address
  const truncateAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  // Format permission for display
  const formatPermission = (permission: string): string => {
    const permissionMap: Record<string, string> = {
      connect: 'View address',
      sign: 'Sign messages',
      transaction: 'Send transactions',
      records: 'View records',
      viewKey: 'View key access',
      decrypt: 'Decrypt data',
    };
    return permissionMap[permission] || permission;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-accent-aleo" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Connected Sites</h2>
          <p className="text-sm text-text-muted mt-1">
            Manage dApps that have access to your wallet
          </p>
        </div>
        {sites.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={handleDisconnectAll}
            loading={disconnecting === 'all'}
          >
            Disconnect All
          </Button>
        )}
      </div>

      {/* Sites List */}
      {sites.length === 0 ? (
        <div className="text-center py-12 bg-bg-primary rounded-lg border border-bg-elevated">
          <svg className="w-12 h-12 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p className="text-text-muted">No connected sites</p>
          <p className="text-sm text-text-muted mt-1">
            When you connect to dApps, they will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map((site) => (
            <div
              key={site.origin}
              className="bg-bg-primary rounded-lg border border-bg-elevated overflow-hidden"
            >
              {/* Site Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {/* Favicon */}
                  <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center overflow-hidden">
                    {site.favicon ? (
                      <img
                        src={site.favicon}
                        alt={getDomain(site.origin)}
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{site.title || getDomain(site.origin)}</p>
                    <p className="text-xs text-text-muted">{getDomain(site.origin)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnect(site.origin)}
                  loading={disconnecting === site.origin}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Disconnect
                </Button>
              </div>

              {/* Site Details */}
              <div className="px-4 pb-4 space-y-3">
                {/* Connected Address */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Connected wallet</span>
                  <span className="font-mono text-accent-aleo">{truncateAddress(site.address)}</span>
                </div>

                {/* Permissions */}
                <div>
                  <p className="text-xs text-text-muted mb-2">Permissions</p>
                  <div className="flex flex-wrap gap-2">
                    {site.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="px-2 py-1 text-xs bg-bg-elevated rounded-full text-text-secondary"
                      >
                        {formatPermission(permission)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-bg-elevated">
                  <span>Connected: {formatDate(site.connectedAt)}</span>
                  <span>Last used: {formatDate(site.lastAccessedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="p-4 bg-bg-primary rounded-lg border border-bg-elevated">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-text-muted">
            <p className="font-medium text-text-secondary mb-1">About Connected Sites</p>
            <p>
              Connected sites can view your wallet address and request transactions.
              They cannot access your private keys or make transactions without your approval.
              Disconnect any site you no longer use or trust.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectedSites;
