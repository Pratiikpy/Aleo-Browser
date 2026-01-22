import React, { useState, useEffect } from 'react';

interface MemorySaverSettings {
  enabled: boolean;
  autoSuspendEnabled: boolean;
  autoSuspendDelayMinutes: number;
  neverSuspendPinnedTabs: boolean;
  neverSuspendAudioTabs: boolean;
  neverSuspendDomains: string[];
}

interface ReaderSettings {
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  fontFamily: 'serif' | 'sans-serif' | 'mono';
  theme: 'light' | 'dark' | 'sepia';
  lineHeight: 'normal' | 'relaxed' | 'loose';
  maxWidth: 'narrow' | 'medium' | 'wide';
}

interface MemorySaverStats {
  suspendedCount: number;
  estimatedMemorySavedMB: number;
  enabled: boolean;
}

export const PerformanceSettings: React.FC = () => {
  // Memory Saver state
  const [memorySaverSettings, setMemorySaverSettings] = useState<MemorySaverSettings>({
    enabled: true,
    autoSuspendEnabled: true,
    autoSuspendDelayMinutes: 30,
    neverSuspendPinnedTabs: true,
    neverSuspendAudioTabs: true,
    neverSuspendDomains: [],
  });
  const [memorySaverStats, setMemorySaverStats] = useState<MemorySaverStats>({
    suspendedCount: 0,
    estimatedMemorySavedMB: 0,
    enabled: false,
  });
  const [newDomain, setNewDomain] = useState('');

  // Reader Mode state
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>({
    fontSize: 'medium',
    fontFamily: 'serif',
    theme: 'dark',
    lineHeight: 'normal',
    maxWidth: 'medium',
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load Memory Saver settings
      const suspendSettings = await window.electron.tabSuspend.getSettings();
      setMemorySaverSettings(suspendSettings);

      const stats = await window.electron.tabSuspend.getStats();
      setMemorySaverStats(stats);

      // Load Reader settings
      const reader = await window.electron.reader.getSettings();
      setReaderSettings(reader);
    } catch (error) {
      console.error('Failed to load performance settings:', error);
    }
  };

  // Memory Saver handlers
  const handleMemorySaverToggle = async (enabled: boolean) => {
    try {
      await window.electron.tabSuspend.setEnabled(enabled);
      setMemorySaverSettings((prev) => ({ ...prev, enabled }));
    } catch (error) {
      console.error('Failed to toggle memory saver:', error);
    }
  };

  const handleAutoSuspendToggle = async (autoSuspendEnabled: boolean) => {
    try {
      await window.electron.tabSuspend.updateSettings({ autoSuspendEnabled });
      setMemorySaverSettings((prev) => ({ ...prev, autoSuspendEnabled }));
    } catch (error) {
      console.error('Failed to toggle auto-suspend:', error);
    }
  };

  const handleDelayChange = async (minutes: number) => {
    try {
      await window.electron.tabSuspend.updateSettings({ autoSuspendDelayMinutes: minutes });
      setMemorySaverSettings((prev) => ({ ...prev, autoSuspendDelayMinutes: minutes }));
    } catch (error) {
      console.error('Failed to update delay:', error);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    const domain = newDomain.trim().toLowerCase();
    if (memorySaverSettings.neverSuspendDomains.includes(domain)) return;

    try {
      await window.electron.tabSuspend.addNeverSuspendDomain(domain);
      setMemorySaverSettings((prev) => ({
        ...prev,
        neverSuspendDomains: [...prev.neverSuspendDomains, domain],
      }));
      setNewDomain('');
    } catch (error) {
      console.error('Failed to add domain:', error);
    }
  };

  const handleRemoveDomain = async (domain: string) => {
    try {
      await window.electron.tabSuspend.removeNeverSuspendDomain(domain);
      setMemorySaverSettings((prev) => ({
        ...prev,
        neverSuspendDomains: prev.neverSuspendDomains.filter((d) => d !== domain),
      }));
    } catch (error) {
      console.error('Failed to remove domain:', error);
    }
  };

  // Reader Mode handlers
  const handleReaderSettingChange = async <K extends keyof ReaderSettings>(
    key: K,
    value: ReaderSettings[K]
  ) => {
    try {
      await window.electron.reader.updateSettings({ [key]: value });
      setReaderSettings((prev) => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Failed to update reader setting:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Performance</h2>
        <p className="text-text-secondary mt-1">
          Manage memory usage and reading experience
        </p>
      </div>

      {/* Memory Saver Section */}
      <div className="bg-bg-secondary border border-bg-elevated rounded-xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Memory Saver</h3>
              <p className="text-sm text-text-muted">
                Free up memory by suspending inactive tabs
              </p>
            </div>
          </div>
          <button
            onClick={() => handleMemorySaverToggle(!memorySaverSettings.enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              memorySaverSettings.enabled ? 'bg-blue-500' : 'bg-bg-elevated'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                memorySaverSettings.enabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {memorySaverSettings.enabled && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-bg-primary rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">{memorySaverStats.suspendedCount}</div>
                <div className="text-sm text-text-muted">Tabs Suspended</div>
              </div>
              <div className="bg-bg-primary rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">
                  {memorySaverStats.estimatedMemorySavedMB.toFixed(0)} MB
                </div>
                <div className="text-sm text-text-muted">Memory Saved</div>
              </div>
            </div>

            {/* Auto-suspend toggle */}
            <div className="flex items-center justify-between py-3 border-t border-bg-elevated">
              <div>
                <div className="font-medium text-text-primary">Auto-suspend inactive tabs</div>
                <div className="text-sm text-text-muted">
                  Automatically suspend tabs after {memorySaverSettings.autoSuspendDelayMinutes} minutes
                </div>
              </div>
              <button
                onClick={() => handleAutoSuspendToggle(!memorySaverSettings.autoSuspendEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  memorySaverSettings.autoSuspendEnabled ? 'bg-blue-500' : 'bg-bg-elevated'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    memorySaverSettings.autoSuspendEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Delay selector */}
            {memorySaverSettings.autoSuspendEnabled && (
              <div className="flex items-center gap-4 py-3 border-t border-bg-elevated">
                <span className="text-text-primary">Suspend after</span>
                <select
                  value={memorySaverSettings.autoSuspendDelayMinutes}
                  onChange={(e) => handleDelayChange(parseInt(e.target.value))}
                  className="bg-bg-primary border border-bg-elevated rounded px-3 py-1 text-text-primary"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            )}

            {/* Never-suspend domains */}
            <div className="pt-4 border-t border-bg-elevated">
              <div className="font-medium text-text-primary mb-3">Never suspend these sites</div>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                  className="flex-1 bg-bg-primary border border-bg-elevated rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted"
                />
                <button
                  onClick={handleAddDomain}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {memorySaverSettings.neverSuspendDomains.map((domain) => (
                  <span
                    key={domain}
                    className="px-3 py-1 bg-bg-primary rounded-full text-sm text-text-secondary flex items-center gap-2"
                  >
                    {domain}
                    <button
                      onClick={() => handleRemoveDomain(domain)}
                      className="hover:text-red-400"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
                {memorySaverSettings.neverSuspendDomains.length === 0 && (
                  <span className="text-sm text-text-muted">No sites added</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Reader Mode Section */}
      <div className="bg-bg-secondary border border-bg-elevated rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Reader Mode</h3>
            <p className="text-sm text-text-muted">
              Customize the reading experience for articles
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Font Size */}
          <div className="flex items-center justify-between py-2">
            <span className="text-text-primary">Font Size</span>
            <select
              value={readerSettings.fontSize}
              onChange={(e) => handleReaderSettingChange('fontSize', e.target.value as ReaderSettings['fontSize'])}
              className="bg-bg-primary border border-bg-elevated rounded px-3 py-1 text-text-primary"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="x-large">Extra Large</option>
            </select>
          </div>

          {/* Font Family */}
          <div className="flex items-center justify-between py-2">
            <span className="text-text-primary">Font Family</span>
            <select
              value={readerSettings.fontFamily}
              onChange={(e) => handleReaderSettingChange('fontFamily', e.target.value as ReaderSettings['fontFamily'])}
              className="bg-bg-primary border border-bg-elevated rounded px-3 py-1 text-text-primary"
            >
              <option value="serif">Serif</option>
              <option value="sans-serif">Sans Serif</option>
              <option value="mono">Monospace</option>
            </select>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between py-2">
            <span className="text-text-primary">Theme</span>
            <div className="flex gap-2">
              {(['light', 'dark', 'sepia'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => handleReaderSettingChange('theme', theme)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    readerSettings.theme === theme
                      ? 'border-accent-aleo'
                      : 'border-transparent'
                  } ${
                    theme === 'light'
                      ? 'bg-white'
                      : theme === 'dark'
                      ? 'bg-gray-900'
                      : 'bg-amber-100'
                  }`}
                  title={theme.charAt(0).toUpperCase() + theme.slice(1)}
                />
              ))}
            </div>
          </div>

          {/* Line Height */}
          <div className="flex items-center justify-between py-2">
            <span className="text-text-primary">Line Spacing</span>
            <select
              value={readerSettings.lineHeight}
              onChange={(e) => handleReaderSettingChange('lineHeight', e.target.value as ReaderSettings['lineHeight'])}
              className="bg-bg-primary border border-bg-elevated rounded px-3 py-1 text-text-primary"
            >
              <option value="normal">Normal</option>
              <option value="relaxed">Relaxed</option>
              <option value="loose">Loose</option>
            </select>
          </div>

          {/* Max Width */}
          <div className="flex items-center justify-between py-2">
            <span className="text-text-primary">Content Width</span>
            <select
              value={readerSettings.maxWidth}
              onChange={(e) => handleReaderSettingChange('maxWidth', e.target.value as ReaderSettings['maxWidth'])}
              className="bg-bg-primary border border-bg-elevated rounded px-3 py-1 text-text-primary"
            >
              <option value="narrow">Narrow</option>
              <option value="medium">Medium</option>
              <option value="wide">Wide</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceSettings;
