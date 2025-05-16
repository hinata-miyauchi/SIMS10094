import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getFirestore, collection, addDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-grade-csv-import',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './grade-csv-import.component.html',
  styleUrls: ['./grade-csv-import.component.scss']
})
export class GradeCsvImportComponent {
  message = '';
  loading = false;

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.loading = true;
    this.message = '';
    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).filter(r => r.trim().length > 0);
      const headers = rows[0].split(',').map(h => h.trim());
      const db = getFirestore();
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',');
        if (cols.length < 3) continue;
        const data: any = {};
        headers.forEach((header, idx) => {
          switch (header) {
            case 'year':
            case '年度':
              data.year = Number(cols[idx]);
              break;
            case 'insurance_type':
            case '保険種別':
              data.insurance_type = cols[idx];
              break;
            case 'grade':
            case '等級':
              data.grade = Number(cols[idx]);
              break;
            case 'lower_limit':
            case '下限':
              data.lower_limit = Number(cols[idx]);
              break;
            case 'upper_limit':
            case '上限':
              data.upper_limit = Number(cols[idx]);
              break;
            case 'standard_monthly':
            case '標準報酬月額':
              data.standard_monthly = Number(cols[idx]);
              break;
            default:
              data[header] = cols[idx];
          }
        });
        await addDoc(collection(db, 'grades'), data);
      }
      this.message = 'インポートが完了しました。';
    } catch (e) {
      this.message = 'インポート中にエラーが発生しました。';
    }
    this.loading = false;
  }
} 