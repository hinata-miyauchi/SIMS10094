import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getFirestore, collection, addDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-master-csv-import',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './master-csv-import.component.html',
  styleUrls: ['./master-csv-import.component.scss']
})
export class MasterCsvImportComponent {
  tabIndex = 0; // 0:保険料率, 1:等級
  message = '';
  loading = false;
  selectedFile: File | null = null;
  selectedFileGrade: File | null = null;
  sampleCsv: string = `insurance_year,effective_start_date,effective_end_date,jis_prefecture_code,prefecture_name,insurer_code,branch_name,health_insurance_rate_total,health_insurance_rate_employee,health_insurance_rate_employer,care_insurance_rate_total,care_insurance_rate_employee,care_insurance_rate_employer,pension_insurance_rate_total,pension_insurance_rate_employee,pension_insurance_rate_employer
保険年度,適用開始日,適用終了日,JIS 都道府県コード,都道府県名,保険者コード,支部名,健康保険料率（合計）,健康保険料率（個人負担分）,健康保険料率（法人負担分）,介護保険料率（合計）,介護保険料率（個人負担分）,介護保険料率（法人負担分）,厚生年金保険料率（合計）,厚生年金保険料率（個人負担分）,厚生年金保険料率（法人負担分）
2021,2021-03-01,2022-02-28,1,北海道,01010016,北海道支部,10.45,5.225,5.225,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,2,青森県,01020015,青森県支部,9.96,4.98,4.98,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,3,岩手県,01030014,岩手県支部,9.74,4.87,4.87,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,4,宮城県,01040013,宮城県支部,10.01,5.005,5.005,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,5,秋田県,01050012,秋田県支部,10.16,5.08,5.08,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,6,山形県,01060011,山形県支部,10.03,5.015,5.015,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,7,福島県,01070010,福島県支部,9.64,4.82,4.82,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,8,茨城県,01080019,茨城県支部,9.74,4.87,4.87,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,9,栃木県,01090018,栃木県支部,9.87,4.935,4.935,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,10,群馬県,01100015,群馬県支部,9.66,4.83,4.83,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,11,埼玉県,01110014,埼玉県支部,9.8,4.9,4.9,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,12,千葉県,01120013,千葉県支部,9.79,4.895,4.895,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,13,東京都,01130012,東京都支部,9.84,4.92,4.92,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,14,神奈川県,01140011,神奈川県支部,9.99,4.995,4.995,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,15,新潟県,01150010,新潟県支部,9.5,4.75,4.75,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,16,富山県,01160019,富山県支部,9.59,4.795,4.795,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,17,石川県,01170018,石川県支部,10.11,5.055,5.055,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,18,福井県,01180017,福井県支部,9.98,4.99,4.99,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,19,山梨県,01190016,山梨県支部,9.79,4.895,4.895,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,20,長野県,01200013,長野県支部,9.71,4.855,4.855,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,21,岐阜県,01210012,岐阜県支部,9.83,4.915,4.915,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,22,静岡県,01220011,静岡県支部,9.72,4.86,4.86,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,23,愛知県,01230010,愛知県支部,9.91,4.955,4.955,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,24,三重県,01240019,三重県支部,9.81,4.905,4.905,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,25,滋賀県,01250018,滋賀県支部,9.78,4.89,4.89,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,26,京都府,01260017,京都府支部,10.06,5.03,5.03,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,27,大阪府,01270016,大阪府支部,10.29,5.145,5.145,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,28,兵庫県,01280015,兵庫県支部,10.24,5.12,5.12,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,29,奈良県,01290014,奈良県支部,10,5,5,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,30,和歌山県,01300011,和歌山県支部,10.11,5.055,5.055,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,31,鳥取県,01310010,鳥取県支部,9.97,4.985,4.985,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,32,島根県,01320019,島根県支部,10.03,5.015,5.015,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,33,岡山県,01330018,岡山県支部,10.18,5.09,5.09,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,34,広島県,01340017,広島県支部,10.04,5.02,5.02,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,35,山口県,01350016,山口県支部,10.22,5.11,5.11,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,36,徳島県,01360015,徳島県支部,10.29,5.145,5.145,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,37,香川県,01370014,香川県支部,10.28,5.14,5.14,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,38,愛媛県,01380013,愛媛県支部,10.22,5.11,5.11,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,39,高知県,01390012,高知県支部,10.17,5.085,5.085,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,40,福岡県,01400019,福岡県支部,10.22,5.11,5.11,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,41,佐賀県,01410018,佐賀県支部,10.68,5.34,5.34,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,42,長崎県,01420017,長崎県支部,10.26,5.13,5.13,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,43,熊本県,01430016,熊本県支部,10.29,5.145,5.145,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,44,大分県,01440015,大分県支部,10.3,5.15,5.15,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,45,宮崎県,01450014,宮崎県支部,9.83,4.915,4.915,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,46,鹿児島県,01460013,鹿児島県支部,10.36,5.18,5.18,1.8,0.9,0.9,18.3,9.15,9.15
2021,2021-03-01,2022-02-28,47,沖縄県,01470012,沖縄県支部,9.95,4.975,4.975,1.8,0.9,0.9,18.3,9.15,9.15`;

  sampleCsvGrade: string = `grade,standard,lower_limit,upper_limit\n等級,標準報酬月額,下限額（以上）,上限額（未満）\n1,58000,,63000\n2,68000,63000,73000\n3,78000,73000,83000\n4,88000,83000,93000\n5,98000,93000,101000\n6,104000,101000,107000\n7,110000,107000,114000\n8,118000,114000,122000\n9,126000,122000,130000\n10,134000,130000,138000\n11,142000,138000,146000\n12,150000,146000,155000\n13,160000,155000,165000\n14,170000,165000,175000\n15,180000,175000,185000\n16,190000,185000,195000\n17,200000,195000,210000\n18,220000,210000,230000\n19,240000,230000,250000\n20,260000,250000,270000\n21,280000,270000,290000\n22,300000,290000,310000\n23,320000,310000,330000\n24,340000,330000,350000\n25,360000,350000,370000\n26,380000,370000,395000\n27,410000,395000,425000\n28,440000,425000,455000\n29,470000,455000,485000\n30,500000,485000,515000\n31,530000,515000,545000\n32,560000,545000,575000\n33,590000,575000,605000\n34,620000,605000,635000\n35,650000,635000,665000\n36,680000,665000,695000\n37,710000,695000,730000\n38,750000,730000,770000\n39,790000,770000,810000\n40,830000,810000,855000\n41,880000,855000,905000\n42,930000,905000,955000\n43,980000,955000,1005000\n44,1030000,1005000,1055000\n45,1090000,1055000,1115000\n46,1150000,1115000,1175000\n47,1210000,1175000,1235000\n48,1270000,1235000,1295000\n49,1330000,1295000,1355000\n50,1390000,1355000,`;

  formatCsv: string = `insurance_year,effective_start_date,effective_end_date,jis_prefecture_code,prefecture_name,insurer_code,branch_name,health_insurance_rate_total,health_insurance_rate_employee,health_insurance_rate_employer,care_insurance_rate_total,care_insurance_rate_employee,care_insurance_rate_employer,pension_insurance_rate_total,pension_insurance_rate_employee,pension_insurance_rate_employer`;
  formatCsvGrade: string = `grade,standard,lower_limit,upper_limit`;

  constructor(private router: Router) {}

  setTab(idx: number) {
    this.tabIndex = idx;
    this.message = '';
    this.selectedFile = null;
    this.selectedFileGrade = null;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.selectedFile = input.files[0];
    this.message = '';
  }
  onFileSelectedGrade(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.selectedFileGrade = input.files[0];
    this.message = '';
  }

  async importCsv() {
    if (!this.selectedFile) return;
    this.loading = true;
    this.message = '';
    try {
      const text = await this.selectedFile.text();
      const rows = text.split(/\r?\n/).filter(r => r.trim().length > 0);
      const headers = rows[0].split(',').map(h => h.trim());
      const db = getFirestore();
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',');
        if (cols.length < 10) continue;
        const data: any = {};
        headers.forEach((header, idx) => {
          const raw = cols[idx]?.trim() ?? '';
          switch (header) {
            case 'insurance_year':
            case '保険年度':
              data.insurance_year = Number(raw);
              break;
            case 'effective_start_date':
            case '適用開始日':
              data.effective_start_date = raw;
              break;
            case 'effective_end_date':
            case '適用終了日':
              data.effective_end_date = raw;
              break;
            case 'jis_prefecture_code':
            case 'JIS 都道府県コード':
              data.jis_prefecture_code = raw;
              break;
            case 'prefecture_name':
            case '都道府県名':
              data.prefecture_name = raw;
              break;
            case 'insurer_code':
            case '保険者コード':
              data.insurer_code = raw;
              break;
            case 'branch_name':
            case '支部名':
              data.branch_name = raw;
              break;
            case 'health_insurance_rate_total':
            case '健康保険料率（合計）':
              data.health_insurance_rate_total = Number(raw);
              break;
            case 'health_insurance_rate_employee':
            case '健康保険料率（個人負担分）':
              data.health_insurance_rate_employee = Number(raw);
              break;
            case 'health_insurance_rate_employer':
            case '健康保険料率（法人負担分）':
              data.health_insurance_rate_employer = Number(raw);
              break;
            case 'care_insurance_rate_total':
            case '介護保険料率（合計）':
              data.care_insurance_rate_total = Number(raw);
              break;
            case 'care_insurance_rate_employee':
            case '介護保険料率（個人負担分）':
              data.care_insurance_rate_employee = Number(raw);
              break;
            case 'care_insurance_rate_employer':
            case '介護保険料率（法人負担分）':
              data.care_insurance_rate_employer = Number(raw);
              break;
            case 'pension_insurance_rate_total':
            case '厚生年金保険料率（合計）':
              data.pension_insurance_rate_total = Number(raw);
              break;
            case 'pension_insurance_rate_employee':
            case '厚生年金保険料率（個人負担分）':
              data.pension_insurance_rate_employee = Number(raw);
              break;
            case 'pension_insurance_rate_employer':
            case '厚生年金保険料率（法人負担分）':
              data.pension_insurance_rate_employer = Number(raw);
              break;
            default:
              data[header] = raw;
          }
        });
        await addDoc(collection(db, 'insuranceRates'), data);
      }
      this.message = 'インポートが完了しました。3秒後にホームに戻ります。';
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 3000);
    } catch (e) {
      this.message = 'インポート中にエラーが発生しました。';
    }
    this.loading = false;
  }

  async importGradeCsv() {
    if (!this.selectedFileGrade) return;
    this.loading = true;
    this.message = '';
    try {
      const text = await this.selectedFileGrade.text();
      const rows = text.split(/\r?\n/).filter(r => r.trim().length > 0);
      const headers = rows[0].split(',').map(h => h.trim());
      const db = getFirestore();
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',');
        if (cols.length < 4) continue;
        const data: any = {};
        headers.forEach((header, idx) => {
          let raw = cols[idx] ? cols[idx].replace(/,/g, '').trim() : '';
          let value: number | null = null;
          if (raw !== '') {
            value = Number(raw);
            if (isNaN(value)) value = null;
          } else {
            value = null;
          }
          switch (header) {
            case 'grade':
            case '等級':
              data.grade = value;
              break;
            case 'standard':
            case '標準報酬月額':
            case '標準報酬額':
              data.standard = value;
              break;
            case 'lower_limit':
            case '下限':
            case '下限額':
              data.lower_limit = value;
              break;
            case 'upper_limit':
            case '上限':
            case '上限額':
              data.upper_limit = value;
              break;
            default:
              data[header] = cols[idx];
          }
        });
        await addDoc(collection(db, 'grades'), data);
      }
      this.message = '等級インポートが完了しました。3秒後にホームに戻ります。';
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 3000);
    } catch (e) {
      this.message = 'インポート中にエラーが発生しました。';
    }
    this.loading = false;
  }

  downloadSampleCsv() {
    const blob = new Blob([this.sampleCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  downloadSampleCsvGrade() {
    const blob = new Blob([this.sampleCsvGrade], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_grade.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  downloadFormatCsv() {
    const blob = new Blob([this.formatCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'format.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }
  downloadFormatCsvGrade() {
    const blob = new Blob([this.formatCsvGrade], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'format_grade.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }
} 