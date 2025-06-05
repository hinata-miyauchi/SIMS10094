import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-insurance-rate-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './insurance-rate-list.component.html',
  styleUrls: ['./insurance-rate-list.component.scss']
})
export class AdminInsuranceRateListComponent implements OnInit {
  insuranceRates: any[] = [];
  filteredRates: any[] = [];
  years: number[] = [];
  prefectures: string[] = [];
  searchYear: string = '';
  searchPrefecture: string = '';

  constructor(private firestore: Firestore) {}

  async ngOnInit() {
    const db = this.firestore;
    const snapshot = await getDocs(collection(db, 'insuranceRates'));
    this.insuranceRates = snapshot.docs.map(doc => doc.data());
    this.filteredRates = [...this.insuranceRates];
    this.years = Array.from(new Set(this.insuranceRates.map(r => Number(r.insurance_year)))).sort((a, b) => b - a);
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
  }

  filterRates() {
    this.filteredRates = this.insuranceRates.filter(rate =>
      (this.searchYear === '' || String(rate.insurance_year) === String(this.searchYear)) &&
      (this.searchPrefecture === '' || rate.prefecture_name === this.searchPrefecture)
    ).sort((a, b) => {
      const yearDiff = Number(b.insurance_year) - Number(a.insurance_year);
      if (yearDiff !== 0) return yearDiff;
      return String(a.jis_prefecture_code).localeCompare(String(b.jis_prefecture_code), 'ja', {numeric: true});
    });
  }

  clearSearch() {
    this.searchYear = '';
    this.searchPrefecture = '';
    this.filterRates();
  }

  ngDoCheck() {
    this.filterRates();
  }
} 