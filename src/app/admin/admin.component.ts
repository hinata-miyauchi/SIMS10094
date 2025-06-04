import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class='home-container'>
      <div class="top-bar">
        <button class='login-btn' (click)="goToLogin()">ログイン画面へ</button>
      </div>
      <h2>管理者メニュー</h2>
      <div class="home-grid">
        <div class="home-card" *ngFor="let item of menuItems">
          <div class="icon">{{item.icon}}</div>
          <div class="card-title">{{item.title}}</div>
          <div class="card-desc">{{item.desc}}</div>
          <button class="table-btn" [routerLink]="item.link">{{item.btn}}</button>
        </div>
      </div>
    </div>`,
  styleUrl: './admin.component.scss'
})
export class AdminComponent {
  menuItems = [
    { icon: '🆕', title: 'アカウント作成', desc: '新しい管理者アカウントを作成します', btn: 'アカウント作成', link: '/admin/account-create' },
    { icon: '📊', title: '保険料・等級登録', desc: '保険料率や等級情報を登録・編集します', btn: '保険料・等級登録', link: '/admin/insurance-rate-grade' }
  ];
  constructor(private router: Router) {}

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
