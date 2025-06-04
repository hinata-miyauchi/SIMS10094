import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getFirestore, collection, addDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-insurance-rate-grade',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './insurance-rate-grade.component.html',
  styleUrls: ['./insurance-rate-grade.component.scss']
})
export class InsuranceRateGradeComponent {
  tabIndex = 0; // 0:保険料率, 1:等級
  message = '';
  loading = false;
  selectedFile: File | null = null;
  selectedFileGrade: File | null = null;
  sampleCsv: string = `insurance_year,effective_start_date,effective_end_date,jis_prefecture_code,prefecture_name,insurer_code,branch_name,health_insurance_rate_total,health_insurance_rate_employee,health_insurance_rate_employer,care_insurance_rate_total,care_insurance_rate_employee,care_insurance_rate_employer,pension_insurance_rate_total,pension_insurance_rate_employee,pension_insurance_rate_employer\n保険年度,適用開始日,適用終了日,JIS 都道府県コード,都道府県名,保険者コード,支部名,健康保険料率（合計）,健康保険料率（個人負担分）,健康保険料率（法人負担分）,介護保険料率（合計）,介護保険料率（個人負担分）,介護保険料率（法人負担分）,厚生年金保険料率（合計）,厚生年金保険料率（個人負担分）,厚生年金保険料率（法人負担分）\n2021,2021-03-01,2022-02-28,1,北海道,01010016,北海道支部,10.45,5.225,5.225,1.8,0.9,0.9,18.3,9.15,9.15`;
  sampleCsvGrade: string = `grade,standard,lower_limit,upper_limit\n等級,標準報酬月額,下限額（以上）,上限額（未満）\n1,58000,,63000\n2,68000,63000,73000`;
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
      this.message = 'インポートが完了しました。';
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
      this.message = '等級インポートが完了しました。';
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
