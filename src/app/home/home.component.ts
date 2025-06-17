import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth, signOut, onAuthStateChanged } from '@angular/fire/auth';
import { Router, RouterLink } from '@angular/router';
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class='home-container'>
    <div style="color: #e53935; font-size: 0.92em; margin-bottom: 8px; font-weight: 500;">
      セキュリティの都合により、本アプリ内でリロードすると自動的にログアウトされます。
    </div>
    <div class="header-bar">
      <div class="user-info-bar">
        <span class="user-icon">👤</span>
        <span class="user-name">{{ displayName }}</span>
      </div>
      <div class="admin-btn-bar">
        <button class="admin-btn" (click)="onLogout()">ログアウト</button>
      </div>
    </div>
    <h2 style="display: flex; align-items: center; gap: 1.2em;">
      ホーム
      <span *ngIf="companyInfoMissing" style="color: #e53935; font-size: 1.05em; font-weight: bold;">会社情報を登録してください。</span>
    </h2>
    <div class="home-grid">
      <div class="home-card" *ngFor="let item of topMenuItems">
        <div class="icon">{{item.icon}}</div>
        <div class="card-title">{{item.title}}</div>
        <div class="card-desc">{{item.desc}}</div>
        <button class="table-btn" [routerLink]="item.link">{{item.btn}}</button>
      </div>
    </div>
    <div class="home-grid">
      <div class="home-card" *ngFor="let item of bottomMenuItems">
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
  topMenuItems = [
    { icon: '👤', title: '従業員情報管理', desc: '従業員一覧、検索、詳細閲覧・編集', btn: '従業員管理', link: '/employee-list' },
    { icon: '💴', title: '給与情報管理', desc: '従業員の給与情報の登録・履歴管理', btn: '給与管理', link: '/salary-management' },
    { icon: '🏢', title: '会社情報管理', desc: '会社の基本情報を登録・編集', btn: '会社情報', link: '/company-info' },
    { icon: '📄', title: '保険料率一覧', desc: '登録済みの保険料率を一覧表示', btn: '保険料率一覧', link: '/insurance-rate-list' }
  ];
  bottomMenuItems = [
    { icon: '🛡️', title: '社会保険情報管理', desc: '社会保険（健康保険・介護保険・厚生年金）の支払（加入）状況一覧', btn: '社会保険管理', link: '/social-insurance-status' },
    { icon: '📝', title: '等級情報管理', desc: '社会保険加入中従業員の等級一覧', btn: '等級管理', link: '/grade-management' },
    { icon: '🧮', title: '保険料計算', desc: '従業員ごとの保険料を自動算出・表示', btn: '保険料計算', link: '/employee-premium-calc' },
    { icon: '🛌', title: '休業情報管理', desc: '従業員の休業情報の登録・編集・一覧', btn: '休業管理', link: '/leave-management' }
  ];
  displayName: string | null = null;
  companyInfoMissing: boolean = false;
  constructor(private auth: Auth, private router: Router, private firestore: Firestore) {
    onAuthStateChanged(this.auth, async (user) => {
      this.displayName = user?.displayName || user?.email || null;
      if (user) {
        // Firestoreから会社情報の有無を確認
        const q = query(collection(this.firestore, 'company'), where('uid', '==', user.uid));
        const snap = await getDocs(q);
        this.companyInfoMissing = snap.empty;
      }
    });
  }

  async onLogout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
} 