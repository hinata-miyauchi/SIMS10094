import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';

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
  grade: number;
  diff: number;
  match: boolean;
  salary: number;
  salaryGrade: number;
  gradeDiff: number;
  gradeDiffAlert: boolean;
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
    // uid取得
    const uid = (await import('@angular/fire/auth')).getAuth().currentUser?.uid;
    if (!uid) { this.loading = false; return; }
    // employees取得（uidで絞り込み）
    const employeesSnap = await getDocs(query(collection(this.firestore, 'employees'), where('uid', '==', uid)));
    const employees = employeesSnap.docs.map(doc => doc.data() as any);
    // 社会保険加入者のみ抽出
    const insuredEmployeeNos = employees
      .filter(e => (e.healthInsurance || e.nursingCareInsurance || e.pension))
      .map(e => e.employee_no);
    // salaries取得（uidで絞り込み）
    const salarySnap = await getDocs(query(collection(this.firestore, 'salaries'), where('uid', '==', uid)));
    // 表データ生成（社会保険加入者のみ）
    this.allSalaryRows = salarySnap.docs
      .map(doc => doc.data())
      .filter(d => insuredEmployeeNos.includes(d['employee_no']))
      .map(d => {
        let expectedGradeRaw = this.grades.find(g => Number(d['expected_fixed_salary']) >= g.lower_limit && Number(d['expected_fixed_salary']) < g.upper_limit)?.grade;
        if (expectedGradeRaw === undefined && this.grades.length > 0) {
          // 上限超過時は最上位等級
          const maxGrade = Math.max(...this.grades.map(g => Number(g.grade)));
          expectedGradeRaw = this.grades.find(g => Number(g.grade) === maxGrade)?.grade;
        }
        let salaryGradeRaw = this.grades.find(g => Number(d['salary']) >= g.lower_limit && Number(d['salary']) < g.upper_limit)?.grade;
        if (salaryGradeRaw === undefined && this.grades.length > 0) {
          const maxGrade = Math.max(...this.grades.map(g => Number(g.grade)));
          salaryGradeRaw = this.grades.find(g => Number(g.grade) === maxGrade)?.grade;
        }
        const expectedGrade = typeof expectedGradeRaw === 'number' ? expectedGradeRaw : Number(expectedGradeRaw) || 0;
        const salaryGrade = typeof salaryGradeRaw === 'number' ? salaryGradeRaw : Number(salaryGradeRaw) || 0;
        const gradeNum = expectedGrade;
        const salaryGradeNum = salaryGrade;
        const gradeDiff = Math.abs(gradeNum - salaryGradeNum);
        return {
          employeeNo: d['employee_no'] || '',
          employeeName: d['full_name'] || '',
          salaryMonth: d['salary_date'] || '',
          expectedFixedSalary: Number(d['expected_fixed_salary']) || 0,
          fixedSalary: Number(d['fixed_salary']) || 0,
          grade: expectedGrade,
          diff: 0,
          match: true,
          salary: Number(d['salary']) || 0,
          salaryGrade: salaryGrade,
          gradeDiff: gradeDiff,
          gradeDiffAlert: gradeDiff >= 2
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
      // 従業員番号の昇順でソート
      .sort((a, b) => {
        const aNo = Number(a.employeeNo);
        const bNo = Number(b.employeeNo);
        if (!isNaN(aNo) && !isNaN(bNo)) return aNo - bNo;
        return String(a.employeeNo).localeCompare(String(b.employeeNo), 'ja');
      })
      // 給与月の降順でさらにソート
      .sort((a, b) => (b.salaryMonth || '').localeCompare(a.salaryMonth || ''));
  }

  onClearSearch() {
    this.searchEmployeeNo = '';
    this.searchYear = '';
    this.searchMonth = '';
    this.onSearch();
  }
} 