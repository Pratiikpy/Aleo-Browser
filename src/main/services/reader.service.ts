/**
 * Reader Mode Service
 * Provides distraction-free reading experience by extracting article content
 */

// Using Mozilla's Readability-like extraction algorithm
// We implement a simplified version that works well with most articles

interface ReaderArticle {
  title: string;
  content: string;
  textContent: string;
  author?: string;
  siteName?: string;
  publishedTime?: string;
  excerpt?: string;
  length: number;  // Character count
  readingTime: number;  // Minutes
}

interface ReaderSettings {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  fontFamily: 'serif' | 'sans-serif' | 'mono';
  theme: 'light' | 'sepia' | 'dark';
  lineHeight: 'compact' | 'normal' | 'relaxed';
  maxWidth: 'narrow' | 'medium' | 'wide';
}

// Lazy load electron-store
function createStore(defaults: any): any {
  const Store = require('electron-store');
  return new Store({ name: 'reader-mode', defaults });
}

export class ReaderService {
  private static instance: ReaderService;
  private store: any = null;
  private settings: ReaderSettings | null = null;

  private static readonly defaultSettings: ReaderSettings = {
    fontSize: 'medium',
    fontFamily: 'serif',
    theme: 'dark',  // Match AleoBrowser's dark theme
    lineHeight: 'normal',
    maxWidth: 'medium'
  };

  private constructor() {
    // Lazily initialized
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ReaderService {
    if (!ReaderService.instance) {
      ReaderService.instance = new ReaderService();
    }
    return ReaderService.instance;
  }

  /**
   * Get store instance (lazy)
   */
  private getStore(): any {
    if (!this.store) {
      this.store = createStore({ settings: ReaderService.defaultSettings });
    }
    return this.store;
  }

  /**
   * Ensure settings are loaded
   */
  private ensureLoaded(): void {
    if (!this.settings) {
      this.settings = this.getStore().get('settings');
    }
  }

  /**
   * Get current settings
   */
  getSettings(): ReaderSettings {
    this.ensureLoaded();
    return { ...this.settings! };
  }

  /**
   * Update settings
   */
  updateSettings(updates: Partial<ReaderSettings>): void {
    this.ensureLoaded();
    this.settings = {
      ...this.settings!,
      ...updates
    };
    this.getStore().set('settings', this.settings);
    console.log('[Reader Mode] Settings updated');
  }

  /**
   * Get CSS variables for current settings
   */
  getStyleVariables(): Record<string, string> {
    this.ensureLoaded();
    const s = this.settings!;

    // Font sizes
    const fontSizes = {
      small: '14px',
      medium: '18px',
      large: '22px',
      xlarge: '26px'
    };

    // Font families
    const fontFamilies = {
      serif: 'Georgia, "Times New Roman", serif',
      'sans-serif': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"SF Mono", "Fira Code", "Monaco", monospace'
    };

    // Line heights
    const lineHeights = {
      compact: '1.4',
      normal: '1.7',
      relaxed: '2.0'
    };

    // Max widths
    const maxWidths = {
      narrow: '550px',
      medium: '700px',
      wide: '900px'
    };

    // Themes
    const themes = {
      light: {
        bg: '#ffffff',
        text: '#1a1a1a',
        secondary: '#666666',
        accent: '#00d4aa',
        border: '#e5e5e5'
      },
      sepia: {
        bg: '#f5f1e8',
        text: '#3d3d3d',
        secondary: '#666666',
        accent: '#00a885',
        border: '#d4cfc0'
      },
      dark: {
        bg: '#0a0a0f',
        text: '#e4e4e7',
        secondary: '#a1a1aa',
        accent: '#00d4aa',
        border: '#27272a'
      }
    };

    const theme = themes[s.theme];

    return {
      '--reader-font-size': fontSizes[s.fontSize],
      '--reader-font-family': fontFamilies[s.fontFamily],
      '--reader-line-height': lineHeights[s.lineHeight],
      '--reader-max-width': maxWidths[s.maxWidth],
      '--reader-bg': theme.bg,
      '--reader-text': theme.text,
      '--reader-secondary': theme.secondary,
      '--reader-accent': theme.accent,
      '--reader-border': theme.border
    };
  }

  /**
   * Generate complete reader HTML page
   */
  generateReaderHtml(article: ReaderArticle): string {
    const vars = this.getStyleVariables();
    const styleVars = Object.entries(vars).map(([k, v]) => `${k}: ${v};`).join('\n      ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(article.title)} - Reader Mode</title>
  <style>
    :root {
      ${styleVars}
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: var(--reader-bg);
      color: var(--reader-text);
      font-family: var(--reader-font-family);
      font-size: var(--reader-font-size);
      line-height: var(--reader-line-height);
      padding: 40px 20px 80px;
      min-height: 100vh;
    }

    .reader-container {
      max-width: var(--reader-max-width);
      margin: 0 auto;
    }

    .reader-header {
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--reader-border);
    }

    .reader-title {
      font-size: 2em;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 16px;
      color: var(--reader-text);
    }

    .reader-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      color: var(--reader-secondary);
      font-size: 0.9em;
    }

    .reader-meta span {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .reader-content {
      color: var(--reader-text);
    }

    .reader-content p {
      margin-bottom: 1.5em;
    }

    .reader-content h1,
    .reader-content h2,
    .reader-content h3,
    .reader-content h4,
    .reader-content h5,
    .reader-content h6 {
      margin-top: 1.5em;
      margin-bottom: 0.75em;
      font-weight: 600;
      line-height: 1.3;
    }

    .reader-content h2 { font-size: 1.5em; }
    .reader-content h3 { font-size: 1.25em; }
    .reader-content h4 { font-size: 1.1em; }

    .reader-content a {
      color: var(--reader-accent);
      text-decoration: none;
    }

    .reader-content a:hover {
      text-decoration: underline;
    }

    .reader-content img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 1em 0;
    }

    .reader-content blockquote {
      border-left: 3px solid var(--reader-accent);
      padding-left: 1em;
      margin: 1.5em 0;
      color: var(--reader-secondary);
      font-style: italic;
    }

    .reader-content code {
      background: var(--reader-border);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 0.9em;
    }

    .reader-content pre {
      background: var(--reader-border);
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1.5em 0;
    }

    .reader-content pre code {
      background: none;
      padding: 0;
    }

    .reader-content ul,
    .reader-content ol {
      margin: 1em 0;
      padding-left: 2em;
    }

    .reader-content li {
      margin-bottom: 0.5em;
    }

    .reader-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
    }

    .reader-content th,
    .reader-content td {
      border: 1px solid var(--reader-border);
      padding: 8px 12px;
      text-align: left;
    }

    .reader-content th {
      background: var(--reader-border);
    }

    .reader-footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid var(--reader-border);
      text-align: center;
      color: var(--reader-secondary);
      font-size: 0.85em;
    }

    .reader-footer a {
      color: var(--reader-accent);
    }

    /* Aleo branding */
    .aleo-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--reader-border);
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.8em;
      margin-top: 16px;
    }

    .aleo-badge svg {
      width: 14px;
      height: 14px;
    }

    /* Selection color */
    ::selection {
      background: var(--reader-accent);
      color: var(--reader-bg);
    }
  </style>
</head>
<body>
  <article class="reader-container">
    <header class="reader-header">
      <h1 class="reader-title">${this.escapeHtml(article.title)}</h1>
      <div class="reader-meta">
        ${article.author ? `<span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${this.escapeHtml(article.author)}</span>` : ''}
        ${article.siteName ? `<span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>${this.escapeHtml(article.siteName)}</span>` : ''}
        <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${article.readingTime} min read</span>
        <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>${article.length.toLocaleString()} characters</span>
      </div>
    </header>

    <div class="reader-content">
      ${article.content}
    </div>

    <footer class="reader-footer">
      <p>Rendered in Reader Mode</p>
      <div class="aleo-badge">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        AleoBrowser
      </div>
    </footer>
  </article>
</body>
</html>`;
  }

  /**
   * Escape HTML entities
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Calculate reading time (words per minute)
   */
  calculateReadingTime(text: string): number {
    const wordsPerMinute = 200;
    const wordCount = text.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  /**
   * Check if URL is likely readable (article-like content)
   */
  isLikelyReadable(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.toLowerCase();

      // Exclude common non-article patterns
      const nonReadablePatterns = [
        /^\/$/,  // Home pages
        /^\/(login|signup|register|auth)/,
        /^\/(cart|checkout|payment)/,
        /^\/(search|results)/,
        /^\/(settings|account|profile)/,
        /\.(pdf|jpg|png|gif|mp4|mp3)$/i,
      ];

      if (nonReadablePatterns.some(p => p.test(path))) {
        return false;
      }

      // Likely article patterns
      const readablePatterns = [
        /\/(article|post|blog|news|story)\//,
        /\/\d{4}\/\d{2}\//,  // Date-based URLs (blog posts)
        /\/(p|posts?)\//,
      ];

      // If matches readable pattern, definitely yes
      if (readablePatterns.some(p => p.test(path))) {
        return true;
      }

      // Otherwise, assume content with path depth > 1 might be readable
      const pathDepth = path.split('/').filter(Boolean).length;
      return pathDepth >= 2;
    } catch {
      return false;
    }
  }
}

// Export singleton
export const readerService = ReaderService.getInstance();

// Export getter
export function getReaderService(): ReaderService {
  return ReaderService.getInstance();
}
