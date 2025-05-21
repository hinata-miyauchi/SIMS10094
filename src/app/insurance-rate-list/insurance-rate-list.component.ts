import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getFirestore, collection, getDocs } from '@angular/fire/firestore';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-insurance-rate-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="insurance-rate-list-container">
      <button class="back-btn" routerLink="/home">ホームに戻る</button>
      <h2>保険料率一覧</h2>
      <form class="search-form" (ngSubmit)="$event.preventDefault()">
        <label>
          年度：
          <select [(ngModel)]="searchYear" name="searchYear">
            <option value="">すべて</option>
            <option *ngFor="let y of years" [value]="y">{{y}}</option>
          </select>
        </label>
        <label>
          都道府県名：
          <select [(ngModel)]="searchPrefecture" name="searchPrefecture">
            <option value="">すべて</option>
            <option *ngFor="let p of prefectures" [value]="p">{{p}}</option>
          </select>
        </label>
        <button type="button" (click)="clearSearch()">クリア</button>
      </form>
      <table *ngIf="filteredRates.length > 0">
        <thead>
          <tr>
            <th>年度</th>
            <th>都道府県コード</th>
            <th>都道府県名</th>
            <th>健康保険料率(%)</th>
            <th>介護保険料率(%)</th>
            <th>厚生年金保険料率(%)</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let rate of filteredRates">
            <td>{{rate.year}}</td>
            <td>{{rate.prefecture_code}}</td>
            <td>{{rate.prefecture_name}}</td>
            <td>{{rate.health_insurance_rate}}</td>
            <td>{{rate.nursing_care_insurance_rate}}</td>
            <td>{{rate.employees_pension_insurance_rate}}</td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="filteredRates.length === 0">登録済みの保険料率はありません。</div>
    </div>
  `,
  styleUrls: ['./insurance-rate-list.component.scss']
})
export class InsuranceRateListComponent implements OnInit {
  insuranceRates: any[] = [];
  filteredRates: any[] = [];
  years: string[] = [];
  prefectures: string[] = [];
  searchYear: string = '';
  searchPrefecture: string = '';

  async ngOnInit() {
    const db = getFirestore();
    const snapshot = await getDocs(collection(db, 'insuranceRates'));
    this.insuranceRates = snapshot.docs.map(doc => doc.data());
    this.filteredRates = [...this.insuranceRates];
    // 年度・都道府県名の選択肢を自動生成
    this.years = Array.from(new Set(this.insuranceRates.map(r => r.year))).sort();
    this.prefectures = Array.from(new Set(this.insuranceRates.map(r => r.prefecture_name))).sort();
  }

  ngOnChanges() {
    this.filterRates();
  }

  filterRates() {
    this.filteredRates = this.insuranceRates.filter(rate =>
      (this.searchYear === '' || String(rate.year) === String(this.searchYear)) &&
      (this.searchPrefecture === '' || rate.prefecture_name === this.searchPrefecture)
    );
  }

  clearSearch() {
    this.searchYear = '';
    this.searchPrefecture = '';
    this.filterRates();
  }

  // 検索条件が変わったら都度フィルタリング
  ngDoCheck() {
    this.filterRates();
  }
} 