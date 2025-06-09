import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

export interface Grade {
  grade: string;
  lower_limit: number;
  upper_limit: number;
}

export interface SalaryRow {
  employeeNo: string;
  employeeName: string;
  salaryMonth: string;
  expectedFixedSalary: number;
  fixedSalary: number;
  grade: string;
  diff: number;
  match: boolean;
}

@Component({
  selector: 'app-grade-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grade-management.component.html',
  styleUrls: ['./grade-management.component.scss']
})
export class GradeManagementComponent {
  grades: Grade[] = [];
  salaryRows: SalaryRow[] = [];
  loading = false;
  searchEmployeeNo: string = '';
  searchYear: string = '';
  searchMonth: string = '';
  yearList: number[] = [];
  monthList: number[] = [1,2,3,4,5,6,7,8,9,10,11,12];
  allSalaryRows: SalaryRow[] = [];

  constructor(private firestore: Firestore, private router: Router) {
    const now = new Date();
    const thisYear = now.getFullYear();
    this.yearList = [];
    for(let y = 2021; y <= thisYear; y++) {
      this.yearList.push(y);
    }
    this.searchYear = thisYear.toString();
    this.searchMonth = (now.getMonth() + 1).toString();
    this.fetchData();
  }

  async fetchData() {
    this.loading = true;
    // grades取得
    const gradeSnap = await getDocs(collection(this.firestore, 'grades'));
    this.grades = gradeSnap.docs.map(doc => doc.data() as Grade);
    // salaries取得
    const salarySnap = await getDocs(collection(this.firestore, 'salaries'));
    // 表データ生成
    this.allSalaryRows = salarySnap.docs.map(doc => {
      const d = doc.data();
      const grade = this.grades.find(g => Number(d['expected_fixed_salary']) >= g.lower_limit && Number(d['expected_fixed_salary']) < g.upper_limit)?.grade || '';
      const diff = Number(d['expected_fixed_salary']) - Number(d['fixed_salary']);
      return {
        employeeNo: d['employee_no'] || '',
        employeeName: d['full_name'] || '',
        salaryMonth: d['salary_date'] || '',
        expectedFixedSalary: Number(d['expected_fixed_salary']) || 0,
        fixedSalary: Number(d['fixed_salary']) || 0,
        grade,
        diff,
        match: diff === 0
      };
    });
    this.salaryRows = [];
    this.loading = false;
    this.onSearch();
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  onSearch() {
    this.salaryRows = this.allSalaryRows
      .filter(row => {
        const matchNo = !this.searchEmployeeNo || row.employeeNo.includes(this.searchEmployeeNo);
        let matchMonth = true;
        if (this.searchYear && this.searchMonth) {
          const ym = `${this.searchYear}-${this.searchMonth.padStart(2, '0')}`;
          matchMonth = row.salaryMonth?.startsWith(ym);
        }
        return matchNo && matchMonth;
      })
      .sort((a, b) => (b.salaryMonth || '').localeCompare(a.salaryMonth || ''));
  }

  onClearSearch() {
    this.searchEmployeeNo = '';
    this.searchYear = '';
    this.searchMonth = '';
    this.onSearch();
  }
} 