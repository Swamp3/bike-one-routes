import { Component, OnInit } from '@angular/core';
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
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.4);
      pointer-events: none;
      z-index: 1000;
    }
  `,
})
export class App implements OnInit {
  version = packageJson.version;

  ngOnInit(): void {
    injectVercelAnalytics();
  }
}
