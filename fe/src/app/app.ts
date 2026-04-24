import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { inject as injectVercelAnalytics } from '@vercel/analytics';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected title = 'bike-one-routes';

  ngOnInit(): void {
    injectVercelAnalytics();
  }
}
