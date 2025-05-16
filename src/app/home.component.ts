import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth, signOut } from '@angular/fire/auth';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `<div class='home-container'>
    <h2>ホーム</h2>
    <p>ログインに成功しました。</p>
    <button class='csv-btn' routerLink="/master-csv-import">CSVインポート画面へ</button>
    <button class='csv-btn' routerLink="/grade-csv-import">等級マスタCSVインポート</button>
    <button class='logout-btn' (click)="onLogout()">ログアウト</button>
  </div>`,
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  constructor(private auth: Auth, private router: Router) {}

  async onLogout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
} 