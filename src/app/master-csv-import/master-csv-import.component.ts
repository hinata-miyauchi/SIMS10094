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
  message = '';
  loading = false;
  selectedFile: File | null = null;

  constructor(private router: Router) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.selectedFile = input.files[0];
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
        if (cols.length < 5) continue;
        // 柔軟なマッピング
        const data: any = {};
        headers.forEach((header, idx) => {
          // 列名をFirestoreのフィールド名に変換
          switch (header) {
            case 'document_id':
              data.document_id = cols[idx];
              break;
            case 'year':
            case '年度':
              data.year = Number(cols[idx]);
              break;
            case 'prefecture_code':
            case 'JIS 都道府県コード':
              data.prefecture_code = cols[idx];
              break;
            case 'prefecture_name':
            case '都道府県名':
              data.prefecture_name = cols[idx];
              break;
            case 'health_insurance_rate':
            case '健康保険料率（%）':
              data.health_insurance_rate = Number(cols[idx]);
              break;
            case 'nursing_care_insurance_rate':
            case '介護保険料率（%）':
              data.nursing_care_insurance_rate = Number(cols[idx]);
              break;
            case 'employees_pension_insurance_rate':
            case '厚生年金保険料率（%）':
              data.employees_pension_insurance_rate = Number(cols[idx]);
              break;
            default:
              // その他の列もそのまま保存
              data[header] = cols[idx];
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
} 