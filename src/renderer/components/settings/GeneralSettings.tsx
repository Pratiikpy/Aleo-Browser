import React, { useState } from 'react';
import { Button, Input } from '../shared';

export interface GeneralSettingsData {
  searchEngine: string;
  homepageUrl: string;
  theme: string;
  language: string;
}

export interface GeneralSettingsProps {
  settings: GeneralSettingsData;
  onChange: (settings: GeneralSettingsData) => void;
  onClearBrowsingData: () => void;
}

const SEARCH_ENGINES = [
  { value: 'duckduckgo', label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { value: 'google', label: 'Google', url: 'https://www.google.com/search?q=' },
  { value: 'brave', label: 'Brave Search', url: 'https://search.brave.com/search?q=' },
  { value: 'startpage', label: 'Startpage', url: 'https://www.startpage.com/do/search?q=' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español (Coming Soon)', disabled: true },
  { value: 'fr', label: 'Français (Coming Soon)', disabled: true },
  { value: 'de', label: 'Deutsch (Coming Soon)', disabled: true },
];

/**
 * General Settings Component
 * Handles search engine, homepage, theme, and language preferences
 *
 * @example
 * <GeneralSettings
 *   settings={generalSettings}
 *   onChange={updateGeneralSettings}
 *   onClearBrowsingData={handleClearData}
 * />
 */
export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  settings,
  onChange,
  onClearBrowsingData,
}) => {
  const [clearingData, setClearingData] = useState(false);

  const handleSearchEngineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...settings, searchEngine: e.target.value });
  };

  const handleHomepageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...settings, homepageUrl: e.target.value });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...settings, language: e.target.value });
  };

  const handleClearData = async () => {
    setClearingData(true);
    try {
      await onClearBrowsingData();
    } finally {
      setClearingData(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">General</h2>
        <p className="text-text-muted">Customize your browsing experience</p>
      </div>

      {/* Search Engine */}
      <div className="space-y-2">
        <label
          htmlFor="search-engine"
          className="block text-sm font-medium text-text-primary"
        >
          Default Search Engine
        </label>
        <select
          id="search-engine"
          value={settings.searchEngine}
          onChange={handleSearchEngineChange}
          className="w-full bg-bg-secondary border border-bg-elevated rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-aleo focus:border-accent-aleo transition-all"
        >
          {SEARCH_ENGINES.map((engine) => (
            <option key={engine.value} value={engine.value}>
              {engine.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-text-muted">
          Choose your preferred search engine for the address bar
        </p>
      </div>

      {/* Homepage URL */}
      <div>
        <Input
          label="Homepage URL"
          type="url"
          value={settings.homepageUrl}
          onChange={handleHomepageChange}
          placeholder="https://example.com"
          helperText="The page that opens when you launch AleoBrowser"
          fullWidth
        />
      </div>

      {/* Theme */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-primary">
          Theme
        </label>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-bg-secondary border border-bg-elevated rounded-lg px-4 py-2.5 text-text-primary">
            Dark Theme
          </div>
          <div className="px-3 py-1.5 bg-accent-aleo/10 text-accent-aleo text-sm rounded-md border border-accent-aleo/20">
            Active
          </div>
        </div>
        <p className="text-sm text-text-muted">
          Light theme coming soon. Dark theme provides better privacy and reduced eye strain.
        </p>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <label
          htmlFor="language"
          className="block text-sm font-medium text-text-primary"
        >
          Language
        </label>
        <select
          id="language"
          value={settings.language}
          onChange={handleLanguageChange}
          className="w-full bg-bg-secondary border border-bg-elevated rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-aleo focus:border-accent-aleo transition-all"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value} disabled={lang.disabled}>
              {lang.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-text-muted">
          More languages will be available in future updates
        </p>
      </div>

      {/* Clear Browsing Data */}
      <div className="pt-4 border-t border-bg-elevated">
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-text-primary">Clear Browsing Data</h3>
            <p className="text-sm text-text-muted mt-1">
              Remove cached files, cookies, and browsing history
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleClearData}
            loading={clearingData}
            leftIcon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            }
          >
            Clear Browsing Data
          </Button>
        </div>
      </div>
    </div>
  );
};
