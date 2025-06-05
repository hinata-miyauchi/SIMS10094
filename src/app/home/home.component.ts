import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth, signOut, onAuthStateChanged } from '@angular/fire/auth';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class='home-container'>
    <div class="header-bar">
      <div class="user-info-bar">
        <span class="user-icon">👤</span>
        <span class="user-name">{{ displayName }}</span>
      </div>
      <div class="admin-btn-bar">
        <button class="admin-btn" (click)="onLogout()">ログアウト</button>
      </div>
    </div>
    <h2>ホーム </h2>
    <div class="home-grid">
      <div class="home-card" *ngFor="let item of menuItems">
        <div class="icon">{{item.icon}}</div>
        <div class="card-title">{{item.title}}</div>
        <div class="card-desc">{{item.desc}}</div>
        <button class="table-btn" [routerLink]="item.link">{{item.btn}}</button>
      </div>
    </div>
  </div>`,
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  menuItems = [
    { icon: '👤', title: '従業員管理', desc: '従業員一覧、検索、詳細閲覧・編集', btn: '従業員一覧', link: '/employee-list' },
    { icon: '💴', title: '給与管理', desc: '従業員の給与情報の登録・編集・履歴管理', btn: '給与管理', link: '/salary-management' },
    { icon: '🧮', title: '保険料計算', desc: '従業員ごとの保険料を自動算出・表示', btn: '保険料計算', link: '/employee-premium-calc' },
    { icon: '🛡️', title: '社会保険情報', desc: '健康保険・介護保険・厚生年金の加入状況一覧', btn: '社会保険状況', link: '/social-insurance-status' },
    { icon: '🏢', title: '会社情報', desc: '会社の基本情報を登録・編集', btn: '会社情報', link: '/company-info' },
    { icon: '📄', title: '保険料率一覧', desc: '登録済みの保険料率を一覧表示', btn: '保険料率一覧', link: '/insurance-rate-list' },
    { icon: '🛌', title: '休業情報管理', desc: '従業員の休業情報の登録・編集・一覧', btn: '休業管理', link: '/leave-management' },
    { icon: '📝', title: '等級管理', desc: '等級の一覧・追加・編集', btn: '等級管理', link: '/grade-management' }
  ];
  displayName: string | null = null;
  constructor(private auth: Auth, private router: Router) {
    onAuthStateChanged(this.auth, (user) => {
      this.displayName = user?.displayName || user?.email || null;
    });
  }

  async onLogout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
} 