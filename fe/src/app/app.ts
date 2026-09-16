import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { inject as injectVercelAnalytics } from '@vercel/analytics';
import packageJson from '../../package.json';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styles: `
    .app-version {
      position: fixed;
      bottom: 8px;
      right: 12px;
      font: inherit;
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.4);
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      z-index: 1000;
    }

    .app-version:hover {
      color: rgba(255, 255, 255, 0.7);
    }

    .changelog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      z-index: 2000;
    }

    .changelog-panel {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 640px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    }

    .changelog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #f3f3f3;
    }

    .changelog-header h2 {
      margin: 0;
      font-size: 1.2rem;
      color: #0c2340;
    }

    .changelog-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      color: #666;
      padding: 0;
    }

    .changelog-body {
      margin: 0;
      padding: 1.5rem;
      overflow-y: auto;
      white-space: pre-wrap;
      font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 0.85rem;
      color: #333;
    }
  `,
})
export class App implements OnInit {
  version = packageJson.version;

  readonly showChangelog = signal(false);
  readonly changelogText = signal<string | null>(null);

  ngOnInit(): void {
    injectVercelAnalytics();
  }

  async openChangelog(): Promise<void> {
    this.showChangelog.set(true);
    if (this.changelogText() !== null) return;
    try {
      const response = await fetch('/CHANGELOG.md');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.changelogText.set(await response.text());
    } catch (err) {
      console.error('Error loading changelog:', err);
      this.changelogText.set('Changelog konnte nicht geladen werden.');
    }
  }

  closeChangelog(): void {
    this.showChangelog.set(false);
  }
}
