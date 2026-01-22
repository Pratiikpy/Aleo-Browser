/**
 * Permission Service
 * Manages dApp permissions and connected sites
 */

// Lazy load electron-store
function createStore(options?: { name?: string }): any {
  const Store = require('electron-store');
  return new Store(options);
}

/**
 * Permission types
 */
export type PermissionType =
  | 'connect'          // Basic connection (address access)
  | 'viewKey'          // Access to view key
  | 'sign'             // Sign messages
  | 'transaction'      // Execute transactions
  | 'records'          // Access records
  | 'decrypt';         // Decrypt ciphertexts

/**
 * Site permission record
 */
export interface SitePermission {
  origin: string;
  permissions: PermissionType[];
  connectedAt: number;
  lastAccessedAt: number;
  address: string; // Connected wallet address
  favicon?: string;
  title?: string;
}

/**
 * Pending permission request
 */
export interface PendingPermissionRequest {
  id: string;
  origin: string;
  permissions: PermissionType[];
  requestedAt: number;
  resolve: (granted: boolean) => void;
  reject: (error: Error) => void;
}

/**
 * Permission store schema
 */
interface PermissionStore {
  sites: Record<string, SitePermission>;
  globalSettings: {
    autoApproveTransactions: boolean;
    rememberPermissions: boolean;
    maxConnectedSites: number;
  };
}

export class PermissionService {
  private static instance: PermissionService;
  private store: any = null;
  private pendingRequests: Map<string, PendingPermissionRequest> = new Map();
  private connectedSites: Map<string, SitePermission> = new Map();

  private constructor() {
    this.loadPermissions();
  }

  /**
   * Get the store instance, lazily initialized
   */
  private getStore(): any {
    if (!this.store) {
      this.store = createStore({ name: 'permissions' });
    }
    return this.store;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  /**
   * Load permissions from storage
   */
  private loadPermissions(): void {
    try {
      const sites = this.getStore().get('sites', {}) as Record<string, SitePermission>;
      this.connectedSites = new Map(Object.entries(sites));
      console.log(`Loaded ${this.connectedSites.size} connected sites`);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      this.connectedSites = new Map();
    }
  }

  /**
   * Save permissions to storage
   */
  private savePermissions(): void {
    try {
      const sites: Record<string, SitePermission> = {};
      this.connectedSites.forEach((value, key) => {
        sites[key] = value;
      });
      this.getStore().set('sites', sites);
    } catch (error) {
      console.error('Failed to save permissions:', error);
    }
  }

  /**
   * Get origin from URL
   */
  getOrigin(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.origin;
    } catch {
      return url;
    }
  }

  /**
   * Check if a site has a specific permission
   */
  hasPermission(origin: string, permission: PermissionType): boolean {
    const site = this.connectedSites.get(origin);
    if (!site) return false;
    return site.permissions.includes(permission);
  }

  /**
   * Check if a site is connected
   */
  isConnected(origin: string): boolean {
    return this.connectedSites.has(origin) && this.hasPermission(origin, 'connect');
  }

  /**
   * Get connected site info
   */
  getSitePermission(origin: string): SitePermission | null {
    return this.connectedSites.get(origin) || null;
  }

  /**
   * Get all connected sites
   */
  getAllConnectedSites(): SitePermission[] {
    return Array.from(this.connectedSites.values());
  }

  /**
   * Grant permissions to a site
   */
  grantPermission(
    origin: string,
    permissions: PermissionType[],
    address: string,
    metadata?: { favicon?: string; title?: string }
  ): void {
    const existing = this.connectedSites.get(origin);
    const now = Date.now();

    if (existing) {
      // Merge permissions
      const allPermissions = new Set([...existing.permissions, ...permissions]);
      existing.permissions = Array.from(allPermissions);
      existing.lastAccessedAt = now;
      if (metadata?.favicon) existing.favicon = metadata.favicon;
      if (metadata?.title) existing.title = metadata.title;
    } else {
      // Create new entry
      this.connectedSites.set(origin, {
        origin,
        permissions,
        connectedAt: now,
        lastAccessedAt: now,
        address,
        ...metadata,
      });
    }

    this.savePermissions();
    console.log(`Granted permissions to ${origin}:`, permissions);
  }

  /**
   * Revoke a specific permission from a site
   */
  revokePermission(origin: string, permission: PermissionType): void {
    const site = this.connectedSites.get(origin);
    if (!site) return;

    site.permissions = site.permissions.filter(p => p !== permission);

    // If no permissions left, remove the site entirely
    if (site.permissions.length === 0) {
      this.connectedSites.delete(origin);
    }

    this.savePermissions();
    console.log(`Revoked permission ${permission} from ${origin}`);
  }

  /**
   * Disconnect a site (revoke all permissions)
   */
  disconnectSite(origin: string): void {
    this.connectedSites.delete(origin);
    this.savePermissions();
    console.log(`Disconnected site: ${origin}`);
  }

  /**
   * Disconnect all sites
   */
  disconnectAllSites(): void {
    this.connectedSites.clear();
    this.savePermissions();
    console.log('Disconnected all sites');
  }

  /**
   * Create a pending permission request
   */
  createPermissionRequest(
    origin: string,
    permissions: PermissionType[]
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const id = `${origin}-${Date.now()}`;
      const request: PendingPermissionRequest = {
        id,
        origin,
        permissions,
        requestedAt: Date.now(),
        resolve,
        reject,
      };

      this.pendingRequests.set(id, request);

      // Auto-timeout after 5 minutes
      setTimeout(() => {
        const pending = this.pendingRequests.get(id);
        if (pending) {
          pending.reject(new Error('Permission request timed out'));
          this.pendingRequests.delete(id);
        }
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Get pending requests for a specific origin
   */
  getPendingRequests(origin?: string): PendingPermissionRequest[] {
    const requests = Array.from(this.pendingRequests.values());
    if (origin) {
      return requests.filter(r => r.origin === origin);
    }
    return requests;
  }

  /**
   * Resolve a pending permission request
   */
  resolvePermissionRequest(requestId: string, granted: boolean): void {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      console.warn(`Permission request ${requestId} not found`);
      return;
    }

    request.resolve(granted);
    this.pendingRequests.delete(requestId);
  }

  /**
   * Update last accessed time for a site
   */
  updateLastAccessed(origin: string): void {
    const site = this.connectedSites.get(origin);
    if (site) {
      site.lastAccessedAt = Date.now();
      this.savePermissions();
    }
  }

  /**
   * Get global settings
   */
  getGlobalSettings(): PermissionStore['globalSettings'] {
    return this.getStore().get('globalSettings', {
      autoApproveTransactions: false,
      rememberPermissions: true,
      maxConnectedSites: 50,
    });
  }

  /**
   * Update global settings
   */
  updateGlobalSettings(settings: Partial<PermissionStore['globalSettings']>): void {
    const current = this.getGlobalSettings();
    this.getStore().set('globalSettings', { ...current, ...settings });
  }

  /**
   * Clean up old/expired permissions (sites not accessed in 30 days)
   */
  cleanupExpiredPermissions(maxAge: number = 30 * 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let removed = 0;

    this.connectedSites.forEach((site, origin) => {
      if (now - site.lastAccessedAt > maxAge) {
        this.connectedSites.delete(origin);
        removed++;
      }
    });

    if (removed > 0) {
      this.savePermissions();
      console.log(`Cleaned up ${removed} expired site permissions`);
    }

    return removed;
  }

  /**
   * Export permissions (for backup)
   */
  exportPermissions(): string {
    return JSON.stringify({
      sites: Object.fromEntries(this.connectedSites),
      globalSettings: this.getGlobalSettings(),
      exportedAt: Date.now(),
    }, null, 2);
  }

  /**
   * Import permissions (from backup)
   */
  importPermissions(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      if (parsed.sites) {
        Object.entries(parsed.sites).forEach(([origin, site]) => {
          this.connectedSites.set(origin, site as SitePermission);
        });
      }
      if (parsed.globalSettings) {
        this.updateGlobalSettings(parsed.globalSettings);
      }
      this.savePermissions();
      return true;
    } catch (error) {
      console.error('Failed to import permissions:', error);
      return false;
    }
  }
}

// Export singleton instance
export const permissionService = PermissionService.getInstance();

// Export for lazy loading
export function getPermissionService(): PermissionService {
  return PermissionService.getInstance();
}
