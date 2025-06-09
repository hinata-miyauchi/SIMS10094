import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'SIMS10094';

  constructor(private auth: Auth, private router: Router) {}

  ngOnInit() {
    this.auth.signOut(); // アプリ起動時に必ずログアウト
    onAuthStateChanged(this.auth, user => {
      if (!user) {
        this.router.navigate(['/login']);
      }
    });
  }
}
