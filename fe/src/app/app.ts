import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { inject as injectVercelAnalytics } from '@vercel/analytics';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App implements OnInit {
  ngOnInit(): void {
    injectVercelAnalytics();
  }
}
