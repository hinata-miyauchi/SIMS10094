import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getFirestore, collection, addDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

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
            case '標準報酬額':
              data.standard = value;
              break;
            case 'lower_limit':
            case '下限額':
              data.lower_limit = value;
              break;
            case 'upper_limit':
            case '上限額':
              data.upper_limit = value;
              break;
            default:
              data[header] = cols[idx];
          }
        });
        await addDoc(collection(db, 'grades'), data);
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