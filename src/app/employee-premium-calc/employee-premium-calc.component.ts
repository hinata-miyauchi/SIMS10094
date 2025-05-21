import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { getFirestore, collection, getDocs, DocumentData } from '@angular/fire/firestore';

interface Employee {
  id?: string;
  name: string;
  employeeNo: string;
  salary: number;
  bonus: number;
  department?: string;
  office?: string;
  birth?: string;
  gender?: string;
  address?: string;
  myNumber?: string;
  employmentType?: string;
  joinDate?: string;
  leaveDate?: string;
}

interface Grade {
  grade: number;
  lower: number;
  upper: number;
  standard: number;
}

interface Rate {
  insurance_year: number;
  effective_start_date: string;
  effective_end_date: string;
  jis_prefecture_code: string;
  prefecture_name: string;
  insurer_code: string;
  branch_name: string;
  health_insurance_rate_total: number;
  health_insurance_rate_employee: number;
  health_insurance_rate_employer: number;
  care_insurance_rate_total: number;
  care_insurance_rate_employee: number;
  care_insurance_rate_employer: number;
  pension_insurance_rate_total: number;
  pension_insurance_rate_employee: number;
  pension_insurance_rate_employer: number;
}

@Component({
  selector: 'app-employee-premium-calc',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './employee-premium-calc.component.html',
  styleUrls: ['./employee-premium-calc.component.scss']
})
export class EmployeePremiumCalcComponent implements OnInit {
  employees: Employee[] = [];
  grades: Grade[] = [];
  rates: Rate[] = [];
  loading = false;
  year = new Date().getFullYear();
  prefecture = '東京都'; // 仮デフォルト

  async ngOnInit() {
    this.loading = true;
    const db = getFirestore();
    // 従業員
    const snap = await getDocs(collection(db, 'employees'));
    this.employees = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
    // 等級マスタ
    const gradeSnap = await getDocs(collection(db, 'grades'));
    this.grades = gradeSnap.docs.map(doc => doc.data() as Grade);
    // 保険料率マスタ
    const rateSnap = await getDocs(collection(db, 'rates'));
    this.rates = rateSnap.docs.map(doc => doc.data() as Rate);
    this.loading = false;
  }

  // 従業員ごとの計算結果を返す
  calcPremium(e: Employee) {
    // 等級判定
    const grade = this.grades.find(g => e.salary >= g.lower && e.salary <= g.upper);
    // 標準報酬月額
    const standard = grade ? grade.standard : 0;
    // 保険料率（都道府県・年度でフィルタ）
    const rate = this.rates.find(r => Number(r.insurance_year) === this.year && r.prefecture_name === this.prefecture);
    // 健康保険
    const healthCompany = rate ? Math.round(standard * (rate.health_insurance_rate_employer || 0) / 100) : 0;
    const healthPersonal = rate ? Math.round(standard * (rate.health_insurance_rate_employee || 0) / 100) : 0;
    // 介護保険
    const careCompany = rate ? Math.round(standard * (rate.care_insurance_rate_employer || 0) / 100) : 0;
    const carePersonal = rate ? Math.round(standard * (rate.care_insurance_rate_employee || 0) / 100) : 0;
    // 厚生年金
    const pensionCompany = rate ? Math.round(standard * (rate.pension_insurance_rate_employer || 0) / 100) : 0;
    const pensionPersonal = rate ? Math.round(standard * (rate.pension_insurance_rate_employee || 0) / 100) : 0;
    return {
      grade: grade ? grade.grade : '-',
      standard,
      healthCompany,
      healthPersonal,
      careCompany,
      carePersonal,
      pensionCompany,
      pensionPersonal
    };
  }
} 