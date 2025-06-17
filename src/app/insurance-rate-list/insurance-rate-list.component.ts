import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-insurance-rate-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './insurance-rate-list.component.html',
  styleUrls: ['./insurance-rate-list.component.scss']
})
export class InsuranceRateListComponent implements OnInit {
  insuranceRates: any[] = [];
  filteredRates: any[] = [];
  years: number[] = [];
  prefectures: string[] = [];
  searchYear: string = '';
  searchPrefecture: string = '';
  pendingSearchYear: string = '';
  pendingSearchPrefecture: string = '';
  loading: boolean = false;
  pagedRates: any[] = [];
  currentPage: number = 1;
  pageSize: number = 25;
  totalPages: number = 1;

  constructor(private firestore: Firestore) {}

  async ngOnInit() {
    this.loading = true;
    const db = this.firestore;
    const snapshot = await getDocs(collection(db, 'insuranceRates'));
    this.insuranceRates = snapshot.docs.map(doc => doc.data());
    this.filteredRates = [...this.insuranceRates];
    // 年度の選択肢を降順で生成
    this.years = Array.from(new Set(this.insuranceRates.map(r => Number(r.insurance_year)))).sort((a, b) => b - a);
    // デフォルトで現在の年度をセット
    const currentYear = new Date().getFullYear();
    if (this.years.includes(currentYear)) {
      this.searchYear = String(currentYear);
      this.pendingSearchYear = String(currentYear);
    } else if (this.years.length > 0) {
      this.searchYear = String(this.years[0]);
      this.pendingSearchYear = String(this.years[0]);
    }
    // 都道府県名の選択肢を日本の正式な並び順で生成
    const jpPrefList = [
      '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
      '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
      '新潟県','富山県','石川県','福井県','山梨県','長野県',
      '岐阜県','静岡県','愛知県','三重県',
      '滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
      '鳥取県','島根県','岡山県','広島県','山口県',
      '徳島県','香川県','愛媛県','高知県',
      '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'
    ];
    this.prefectures = jpPrefList.filter(p => this.insuranceRates.some(r => r.prefecture_name === p));
    this.filterRates();
    this.loading = false;
  }

  filterRates() {
    this.filteredRates = this.insuranceRates.filter(rate =>
      (this.searchYear === '' || String(rate.insurance_year) === String(this.searchYear)) &&
      (this.searchPrefecture === '' || rate.prefecture_name === this.searchPrefecture)
    ).sort((a, b) => {
      // 年度の降順
      const yearDiff = Number(b.insurance_year) - Number(a.insurance_year);
      if (yearDiff !== 0) return yearDiff;
      // 年度が同じ場合は都道府県コードの昇順
      return String(a.jis_prefecture_code).localeCompare(String(b.jis_prefecture_code), 'ja', {numeric: true});
    });
    this.currentPage = 1;
    this.updatePagedRates();
  }

  updatePagedRates() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredRates.length / this.pageSize));
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedRates = this.filteredRates.slice(start, end);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagedRates();
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  prevPage() {
    this.goToPage(this.currentPage - 1);
  }

  onSearch() {
    this.searchYear = this.pendingSearchYear;
    this.searchPrefecture = this.pendingSearchPrefecture;
    this.filterRates();
  }

  onClearSearch() {
    this.pendingSearchYear = '';
    this.pendingSearchPrefecture = '';
    this.searchYear = '';
    this.searchPrefecture = '';
    this.filterRates();
  }
} 