import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth, signOut } from '@angular/fire/auth';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class='home-container'>
    <h2>ホーム（管理者向け）</h2>
    <div class="home-grid">
      <div class="home-card" *ngFor="let item of menuItems">
        <div class="icon">{{item.icon}}</div>
        <div class="card-title">{{item.title}}</div>
        <div class="card-desc">{{item.desc}}</div>
        <button class="table-btn" [routerLink]="item.link">{{item.btn}}</button>
      </div>
    </div>
    <button class='logout-btn' (click)="onLogout()">ログアウト</button>
  </div>`,
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  menuItems = [
    { icon: '👤', title: '従業員管理', desc: '従業員一覧、検索、詳細閲覧・編集', btn: '従業員一覧', link: '/employee-list' },
    { icon: '📥', title: 'マスタインポート', desc: 'CSVインポート（保険料率・等級）', btn: 'マスタCSV', link: '/master-csv-import' },
    { icon: '💴', title: '給与管理', desc: '従業員の給与情報の登録・編集・履歴管理', btn: '給与管理', link: '/salary-management' },
    { icon: '📄', title: '保険料率一覧', desc: '登録済みの保険料率を一覧表示', btn: '保険料率一覧', link: '/insurance-rate-list' },
    { icon: '🏢', title: '会社情報', desc: '会社の基本情報を登録・編集', btn: '会社情報', link: '/company-info' },
    { icon: '🧮', title: '保険料計算', desc: '従業員ごとの保険料を自動算出・表示', btn: '保険料計算', link: '/employee-premium-calc' },
    { icon: '🛡️', title: '社会保険状況', desc: '健康保険・介護保険・厚生年金の加入状況一覧', btn: '社会保険状況', link: '/social-insurance-status' }
  ];
  constructor(private auth: Auth, private router: Router) {}

  async onLogout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
} 