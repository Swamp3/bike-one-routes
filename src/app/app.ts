import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { pingAppwrite } from '../lib/appwrite';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected title = 'bike-one-routes';

  constructor() {}

  ngOnInit(): void {
    this.testConnection();
  }

  async testConnection() {
    const result = await pingAppwrite();
    if (result.success) {
      console.log('✅ Appwrite is connected!');
    } else {
      console.error('❌ Appwrite connection failed:', result.message);
    }
  }
}
