/**
 * Privacy and Tracker Blocking Service
 * Provides ad blocking, tracker blocking, and privacy protection
 */

import { PrivacyStats } from '@shared/types';

// Lazy load electron-store to avoid initialization issues
function createStore(defaults: any): any {
  const Store = require('electron-store');
  return new Store({ name: 'privacy', defaults });
}

interface PrivacySettings {
  enabled: boolean;
  blockAds: boolean;
  blockTrackers: boolean;
  blockFingerprinting: boolean;
  httpsEverywhere: boolean;
  strictMode: boolean;
}

interface PrivacyStore {
  settings: PrivacySettings;
  stats: PrivacyStats;
  customBlocklist: string[];
  customAllowlist: string[];
}

export class PrivacyService {
  private static instance: PrivacyService;
  private store: any = null;
  private settings: PrivacySettings | null = null;
  private stats: PrivacyStats | null = null;
  private customBlocklist: Set<string> | null = null;
  private customAllowlist: Set<string> | null = null;

  // Common tracker patterns
  private trackerPatterns: RegExp[] = [
    // Analytics
    /google-analytics\.com/i,
    /googletagmanager\.com/i,
    /analytics\.google\.com/i,
    /doubleclick\.net/i,
    /facebook\.com\/tr/i,
    /facebook\.net/i,
    /connect\.facebook/i,
    /mixpanel\.com/i,
    /segment\.(io|com)/i,
    /amplitude\.com/i,
    /hotjar\.com/i,
    /crazyegg\.com/i,
    /mouseflow\.com/i,
    /fullstory\.com/i,

    // Advertising
    /ads\./, /adservice\./, /adserver\./,
    /adsystem\./, /adtech\./, /advertising\./,
    /googlesyndication\.com/i,
    /googleadservices\.com/i,
    /amazon-adsystem\.com/i,
    /pubmatic\.com/i,
    /taboola\.com/i,
    /outbrain\.com/i,
    /media\.net/i,
    /rubiconproject\.com/i,
    /criteo\.com/i,
    /adnxs\.com/i,

    // Social Media Trackers
    /twitter\.com\/i\/adsct/i,
    /linkedin\.com\/px/i,
    /pinterest\.com\/ct/i,
    /snap\.licdn\.com/i,
    /platform\.twitter\.com/i,

    // Fingerprinting
    /fingerprint\./, /fp\./, /device-id\./,
    /clientid\./, /visitorid\./,
  ];

  // Ad patterns
  private adPatterns: RegExp[] = [
    /\/ads\//i, /\/ad\//i, /\/banner/i,
    /\/advert/i, /\/sponsor/i, /\/popup/i,
    /pagead/i, /adsbygoogle/i,
    /\/adframe/i, /\/adimage/i,
  ];

  // Fingerprinting patterns
  private fingerprintingPatterns: RegExp[] = [
    /fingerprint/i,
    /canvas.*fingerprint/i,
    /webgl.*fingerprint/i,
    /audio.*fingerprint/i,
    /font.*detect/i,
    /device.*detect/i,
    /browser.*detect/i,
  ];

  private static readonly defaultPrivacyStore: PrivacyStore = {
    settings: {
      enabled: true,
      blockAds: true,
      blockTrackers: true,
      blockFingerprinting: true,
      httpsEverywhere: true,
      strictMode: false,
    },
    stats: {
      trackersBlocked: 0,
      adsBlocked: 0,
      fingerprintingBlocked: 0,
      httpsUpgrades: 0,
      totalBlocked: 0,
    },
    customBlocklist: [],
    customAllowlist: [],
  };

  private constructor() {
    // Store is initialized lazily on first use
  }

  /**
   * Get the store instance, lazily initialized
   */
  private getStore(): any {
    if (!this.store) {
      this.store = createStore(PrivacyService.defaultPrivacyStore);
    }
    return this.store;
  }

  /**
   * Ensure data is loaded from store
   */
  private ensureLoaded(): void {
    if (!this.settings) {
      const store = this.getStore();
      this.settings = store.get('settings');
      this.stats = store.get('stats');
      this.customBlocklist = new Set(store.get('customBlocklist'));
      this.customAllowlist = new Set(store.get('customAllowlist'));
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PrivacyService {
    if (!PrivacyService.instance) {
      PrivacyService.instance = new PrivacyService();
    }
    return PrivacyService.instance;
  }

  /**
   * Check if URL should be blocked
   */
  shouldBlock(url: string): { blocked: boolean; reason?: string } {
    this.ensureLoaded();
    if (!this.settings!.enabled) {
      return { blocked: false };
    }

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const fullUrl = url.toLowerCase();

      // Check allowlist first
      if (this.isAllowlisted(hostname)) {
        return { blocked: false };
      }

      // Check custom blocklist
      if (this.isBlocklisted(hostname)) {
        this.incrementStats('custom');
        return { blocked: true, reason: 'Custom blocklist' };
      }

      // Check trackers
      if (this.settings!.blockTrackers && this.isTracker(fullUrl)) {
        this.incrementStats('tracker');
        return { blocked: true, reason: 'Tracker blocked' };
      }

      // Check ads
      if (this.settings!.blockAds && this.isAd(fullUrl)) {
        this.incrementStats('ad');
        return { blocked: true, reason: 'Ad blocked' };
      }

      // Check fingerprinting
      if (this.settings!.blockFingerprinting && this.isFingerprinting(fullUrl)) {
        this.incrementStats('fingerprinting');
        return { blocked: true, reason: 'Fingerprinting blocked' };
      }

      return { blocked: false };
    } catch (error) {
      // Invalid URL, don't block
      return { blocked: false };
    }
  }

  /**
   * Check if URL is a tracker
   */
  private isTracker(url: string): boolean {
    return this.trackerPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if URL is an ad
   */
  private isAd(url: string): boolean {
    return this.adPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if URL is fingerprinting
   */
  private isFingerprinting(url: string): boolean {
    return this.fingerprintingPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if hostname is in allowlist
   */
  private isAllowlisted(hostname: string): boolean {
    return this.customAllowlist!.has(hostname) ||
           Array.from(this.customAllowlist!).some(domain => hostname.endsWith(domain));
  }

  /**
   * Check if hostname is in blocklist
   */
  private isBlocklisted(hostname: string): boolean {
    return this.customBlocklist!.has(hostname) ||
           Array.from(this.customBlocklist!).some(domain => hostname.endsWith(domain));
  }

  /**
   * Increment blocking statistics
   */
  private incrementStats(type: 'tracker' | 'ad' | 'fingerprinting' | 'custom'): void {
    this.ensureLoaded();
    if (type === 'tracker') {
      this.stats!.trackersBlocked++;
    } else if (type === 'ad') {
      this.stats!.adsBlocked++;
    } else if (type === 'fingerprinting') {
      this.stats!.fingerprintingBlocked++;
    }

    this.stats!.totalBlocked++;
    this.saveStats();
  }

  /**
   * Save statistics to store
   */
  private saveStats(): void {
    this.getStore().set('stats', this.stats!);
  }

  /**
   * Get blocking statistics
   */
  getStats(): PrivacyStats {
    this.ensureLoaded();
    return { ...this.stats! };
  }

  /**
   * Get total blocked count
   */
  getBlockedCount(): number {
    this.ensureLoaded();
    return this.stats!.totalBlocked;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.ensureLoaded();
    this.stats = {
      trackersBlocked: 0,
      adsBlocked: 0,
      fingerprintingBlocked: 0,
      httpsUpgrades: 0,
      totalBlocked: 0,
    };
    this.saveStats();
    console.log('Privacy stats reset');
  }

  /**
   * Check if URL should be upgraded to HTTPS (HTTPS Everywhere)
   * Returns the upgraded URL if applicable, or null if no upgrade needed
   */
  shouldUpgradeToHttps(url: string): string | null {
    this.ensureLoaded();

    // Check if HTTPS Everywhere is enabled
    if (!this.settings!.enabled || !this.settings!.httpsEverywhere) {
      return null;
    }

    try {
      const urlObj = new URL(url);

      // Only upgrade HTTP URLs
      if (urlObj.protocol !== 'http:') {
        return null;
      }

      // Don't upgrade localhost or local network addresses
      const hostname = urlObj.hostname.toLowerCase();
      if (hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.endsWith('.local') ||
          hostname.endsWith('.localhost')) {
        return null;
      }

      // Upgrade to HTTPS
      urlObj.protocol = 'https:';
      const upgradedUrl = urlObj.toString();

      // Increment HTTPS upgrade stats
      this.incrementHttpsUpgrade();

      console.log(`[HTTPS Everywhere] Upgraded: ${url} -> ${upgradedUrl}`);
      return upgradedUrl;
    } catch (error) {
      // Invalid URL
      return null;
    }
  }

  /**
   * Increment HTTPS upgrade counter
   */
  incrementHttpsUpgrade(): void {
    this.ensureLoaded();
    if (!this.stats!.httpsUpgrades) {
      this.stats!.httpsUpgrades = 0;
    }
    this.stats!.httpsUpgrades++;
    this.saveStats();
  }

  /**
   * Get HTTPS upgrade count
   */
  getHttpsUpgradeCount(): number {
    this.ensureLoaded();
    return this.stats!.httpsUpgrades || 0;
  }

  /**
   * Check if HTTPS Everywhere is enabled
   */
  isHttpsEverywhereEnabled(): boolean {
    this.ensureLoaded();
    return this.settings!.enabled && this.settings!.httpsEverywhere;
  }

  /**
   * Enable or disable HTTPS Everywhere
   */
  setHttpsEverywhere(enabled: boolean): void {
    this.ensureLoaded();
    this.settings!.httpsEverywhere = enabled;
    this.saveSettings();
    console.log(`HTTPS Everywhere ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable or disable privacy protection
   */
  setEnabled(enabled: boolean): void {
    this.ensureLoaded();
    this.settings!.enabled = enabled;
    this.saveSettings();
    console.log(`Privacy protection ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if privacy protection is enabled
   */
  isEnabled(): boolean {
    this.ensureLoaded();
    return this.settings!.enabled;
  }

  /**
   * Get current settings
   */
  getSettings(): PrivacySettings {
    this.ensureLoaded();
    return { ...this.settings! };
  }

  /**
   * Update settings
   */
  updateSettings(updates: Partial<PrivacySettings>): void {
    this.ensureLoaded();
    this.settings = {
      ...this.settings!,
      ...updates,
    };
    this.saveSettings();
    console.log('Privacy settings updated');
  }

  /**
   * Save settings to store
   */
  private saveSettings(): void {
    this.getStore().set('settings', this.settings!);
  }

  /**
   * Add domain to custom blocklist
   */
  addToBlocklist(domain: string): void {
    this.ensureLoaded();
    const normalized = this.normalizeDomain(domain);
    this.customBlocklist!.add(normalized);
    this.getStore().set('customBlocklist', Array.from(this.customBlocklist!));
    console.log(`Added to blocklist: ${normalized}`);
  }

  /**
   * Remove domain from custom blocklist
   */
  removeFromBlocklist(domain: string): void {
    this.ensureLoaded();
    const normalized = this.normalizeDomain(domain);
    this.customBlocklist!.delete(normalized);
    this.getStore().set('customBlocklist', Array.from(this.customBlocklist!));
    console.log(`Removed from blocklist: ${normalized}`);
  }

  /**
   * Add domain to custom allowlist
   */
  addToAllowlist(domain: string): void {
    this.ensureLoaded();
    const normalized = this.normalizeDomain(domain);
    this.customAllowlist!.add(normalized);
    this.getStore().set('customAllowlist', Array.from(this.customAllowlist!));
    console.log(`Added to allowlist: ${normalized}`);
  }

  /**
   * Remove domain from custom allowlist
   */
  removeFromAllowlist(domain: string): void {
    this.ensureLoaded();
    const normalized = this.normalizeDomain(domain);
    this.customAllowlist!.delete(normalized);
    this.getStore().set('customAllowlist', Array.from(this.customAllowlist!));
    console.log(`Removed from allowlist: ${normalized}`);
  }

  /**
   * Get custom blocklist
   */
  getBlocklist(): string[] {
    this.ensureLoaded();
    return Array.from(this.customBlocklist!);
  }

  /**
   * Get custom allowlist
   */
  getAllowlist(): string[] {
    this.ensureLoaded();
    return Array.from(this.customAllowlist!);
  }

  /**
   * Normalize domain (remove protocol, www, etc.)
   */
  private normalizeDomain(domain: string): string {
    try {
      const url = new URL(domain.startsWith('http') ? domain : `http://${domain}`);
      return url.hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return domain.toLowerCase().replace(/^www\./, '');
    }
  }

  /**
   * Import blocklist (from file or array)
   */
  importBlocklist(domains: string[]): void {
    domains.forEach(domain => {
      if (domain && !domain.startsWith('#')) {
        this.addToBlocklist(domain);
      }
    });
    console.log(`Imported ${domains.length} domains to blocklist`);
  }

  /**
   * Export blocklist
   */
  exportBlocklist(): string[] {
    return this.getBlocklist();
  }

  /**
   * Get blocking summary for a session
   */
  getSessionSummary(): {
    stats: PrivacyStats;
    settings: PrivacySettings;
    enabled: boolean;
  } {
    return {
      stats: this.getStats(),
      settings: this.getSettings(),
      enabled: this.isEnabled(),
    };
  }

  /**
   * Check if specific protection is enabled
   */
  isProtectionEnabled(type: 'ads' | 'trackers' | 'fingerprinting'): boolean {
    this.ensureLoaded();
    if (!this.settings!.enabled) {
      return false;
    }

    switch (type) {
      case 'ads':
        return this.settings!.blockAds;
      case 'trackers':
        return this.settings!.blockTrackers;
      case 'fingerprinting':
        return this.settings!.blockFingerprinting;
      default:
        return false;
    }
  }

  /**
   * Get protection level
   */
  getProtectionLevel(): 'off' | 'standard' | 'strict' {
    this.ensureLoaded();
    if (!this.settings!.enabled) {
      return 'off';
    }
    return this.settings!.strictMode ? 'strict' : 'standard';
  }

  /**
   * Set protection level
   */
  setProtectionLevel(level: 'off' | 'standard' | 'strict'): void {
    this.ensureLoaded();
    switch (level) {
      case 'off':
        this.settings!.enabled = false;
        break;
      case 'standard':
        this.settings!.enabled = true;
        this.settings!.strictMode = false;
        break;
      case 'strict':
        this.settings!.enabled = true;
        this.settings!.strictMode = true;
        this.settings!.blockAds = true;
        this.settings!.blockTrackers = true;
        this.settings!.blockFingerprinting = true;
        break;
    }
    this.saveSettings();
    console.log(`Protection level set to: ${level}`);
  }
}

// Export singleton instance - safe now because Store is lazily initialized in getStore()
export const privacyService = PrivacyService.getInstance();

// Export lazy getter for flexibility
export function getPrivacyService(): PrivacyService {
  return PrivacyService.getInstance();
}
