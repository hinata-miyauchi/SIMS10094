import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth, signOut } from '@angular/fire/auth';
import { Router, RouterLink } from '@angular/router';
import { getFirestore, collection, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class='home-container'>
    <h2>ホーム（管理者向け）</h2>
    <div class="summary-table">
      <table>
        <thead>
          <tr>
            <th>ボタン／カード名</th>
            <th>機能概要</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>従業員管理</td>
            <td>従業員一覧、検索、詳細閲覧・編集</td>
            <td><button class="table-btn" routerLink="/employee-list">従業員一覧</button></td>
          </tr>
          <tr>
            <td>マスタインポート</td>
            <td>CSVインポート機能への導線（保険料率・等級）</td>
            <td>
              <button class="table-btn" routerLink="/master-csv-import">保険料率CSV</button>
              <button class="table-btn" routerLink="/grade-csv-import">等級CSV</button>
            </td>
          </tr>
          <tr>
            <td>保険料率一覧</td>
            <td>登録済みの保険料率を一覧表示</td>
            <td><button class="table-btn" routerLink="/insurance-rate-list">保険料率一覧</button></td>
          </tr>
          <tr>
            <td>帳票出力</td>
            <td>資格取得届などの帳票作成・出力</td>
            <td><button class="table-btn" disabled>準備中</button></td>
          </tr>
          <tr>
            <td>資格情報管理</td>
            <td>取得・喪失の登録、履歴閲覧</td>
            <td><button class="table-btn" disabled>準備中</button></td>
          </tr>
          <tr>
            <td>操作ログ／履歴</td>
            <td>帳票出力・データ変更・ログイン履歴など</td>
            <td><button class="table-btn" disabled>準備中</button></td>
          </tr>
          <tr>
            <td>通知（リマインダー）</td>
            <td>アプリ内通知（提出期限、更新忘れなど）</td>
            <td><button class="table-btn" disabled>準備中</button></td>
          </tr>
          <tr>
            <td>最近の活動</td>
            <td>最近更新されたデータ・従業員一覧</td>
            <td><button class="table-btn" disabled>準備中</button></td>
          </tr>
          <tr>
            <td>会社情報</td>
            <td>会社の基本情報を登録・編集</td>
            <td><button class="table-btn" routerLink="/company-info">会社情報</button></td>
          </tr>
          <tr>
            <td>従業員保険料自動計算</td>
            <td>従業員ごとの保険料を自動算出・表示</td>
            <td><button class="table-btn" routerLink="/employee-premium-calc">保険料計算</button></td>
          </tr>
        </tbody>
      </table>
    </div>
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