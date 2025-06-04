import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Firestore, collection, getDocs, DocumentData, query, where } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { Auth } from '@angular/fire/auth';

interface Employee {
  id?: string;
  full_name: string;
  employee_no: string;
  salary?: number;
  bonus?: number;
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
  lower_limit: number;
  upper_limit: number;
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
  imports: [CommonModule, RouterLink, FormsModule],
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
  selectedSalaryMonth: string = '';
  salaryMonthOptions: { value: string, label: string }[] = [];
  officesForm: any[] = [];
  searchEmployeeNo: string = '';
  salaryYearOptions: number[] = [];
  salaryMonthOnlyOptions: string[] = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  selectedSalaryYear: string = '';
  selectedSalaryMonthOnly: string = '';
  premiumMap: { [employee_no: string]: any } = {};
  noEmployeeFound: boolean = false;
  salaryNotFoundMessage: string = '';

  constructor(private firestore: Firestore, private router: Router, private auth: Auth) {}

  async ngOnInit() {
    this.loading = true;
    // 年の選択肢を生成
    const now = new Date();
    const startYear = 2021;
    this.salaryYearOptions = [];
    for (let y = now.getFullYear(); y >= startYear; y--) {
      this.salaryYearOptions.push(y);
    }
    this.selectedSalaryYear = now.getFullYear().toString();
    this.selectedSalaryMonthOnly = ('0' + (now.getMonth() + 1)).slice(-2);
    this.updateSalaryMonth();
    this.salaryMonthOptions = [];
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 1;
    let y = endYear, m = endMonth;
    while (y > startYear || (y === startYear && m >= startYear)) {
      const value = `${y}-${('0' + m).slice(-2)}`;
      const label = `${y}年${m}月`;
      this.salaryMonthOptions.push({ value, label });
      m--;
      if (m === 0) {
        y--;
        m = 12;
      }
    }
    this.selectedSalaryMonth = this.salaryMonthOptions[0].value;
    // uid取得
    const uid = this.auth.currentUser?.uid;
    if (!uid) { this.loading = false; return; }
    // 等級マスタ（uidで絞り込まない）
    const gradeSnap = await getDocs(collection(this.firestore, 'grades'));
    this.grades = gradeSnap.docs.map(doc => doc.data() as Grade);
    // 保険料率マスタ（uidで絞り込まない）
    const rateSnap = await getDocs(collection(this.firestore, 'insuranceRates'));
    this.rates = rateSnap.docs.map(doc => doc.data() as Rate);
    // 会社情報（uidで絞り込む）
    const companySnap = await getDocs(query(collection(this.firestore, 'company'), where('uid', '==', uid)));
    const companyDoc = companySnap.docs[0];
    if (companyDoc) {
      const companyData = companyDoc.data();
      this.officesForm = companyData['officesForm'] || [];
    }
    this.loading = false;
  }

  updateSalaryMonth() {
    if (this.selectedSalaryYear && this.selectedSalaryMonthOnly) {
      this.selectedSalaryMonth = `${this.selectedSalaryYear}-${this.selectedSalaryMonthOnly}`;
    } else {
      this.selectedSalaryMonth = '';
    }
  }

  async searchEmployeesByNo() {
    // 検索開始時に即座にクリア
    this.employees = [];
    this.premiumMap = {};
    this.noEmployeeFound = false;
    this.salaryNotFoundMessage = '';
    this.loading = true;

    const uid = this.auth.currentUser?.uid;
    if (!uid) { this.loading = false; return; }
    // 社員番号未入力で給与計算年月のみ指定時
    if (!this.searchEmployeeNo && this.selectedSalaryMonth) {
      const salarySnap = await getDocs(query(collection(this.firestore, 'salaries'), where('uid', '==', uid)));
      const matchedSalaries = salarySnap.docs.filter(doc => doc.id.endsWith(`_${this.selectedSalaryMonth}`));
      const employeeNos = matchedSalaries.map(doc => doc.id.split('_')[0]);
      if (employeeNos.length === 0) {
        this.noEmployeeFound = true;
        this.loading = false;
        return;
      }
      // 社員情報をまとめて取得
      const employeesSnap = await getDocs(query(collection(this.firestore, 'employees'), where('uid', '==', uid)));
      this.employees = employeesSnap.docs
        .map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            full_name: data.full_name ?? '',
            employee_no: data.employee_no ?? '',
            salary: Number(data.salary?.base_salary ?? 0) + Number(data.salary?.commuting_allowance ?? 0),
            bonus: Number(data.salary?.bonus ?? 0),
            department: data.department ?? '',
            office: data.office ?? '',
            birth: data.birth_date ?? '',
            gender: data.gender ?? '',
            address: data.address ?? '',
            myNumber: data.employee_no ?? '',
            employmentType: data.employmentType ?? '',
            joinDate: data.joinDate ?? '',
            leaveDate: data.leaveDate ?? ''
          } as Employee;
        })
        .filter(e => employeeNos.includes(e.employee_no));
      // 保険料計算キャッシュ
      this.premiumMap = {};
      for (const e of this.employees) {
        this.premiumMap[e.employee_no] = await this.calcPremium(e);
      }
      this.employees = this.employees.sort((a, b) => a.employee_no.localeCompare(b.employee_no, 'ja'));
      this.noEmployeeFound = false;
      this.loading = false;
      return;
    }

    if (!this.searchEmployeeNo) {
      this.employees = [];
      this.premiumMap = {};
      this.salaryNotFoundMessage = '';
      return;
    }
    this.salaryNotFoundMessage = '';
    const q = query(
      collection(this.firestore, 'employees'),
      where('employee_no', '==', String(this.searchEmployeeNo).trim()),
      where('uid', '==', uid)
    );
    const snap = await getDocs(q);
    this.employees = snap.docs.map(doc => {
      const data = doc.data() as any;
      const baseSalary = Number(data.salary?.base_salary ?? 0);
      const commutingAllowance = Number(data.salary?.commuting_allowance ?? 0);
      const totalSalary = baseSalary + commutingAllowance;
      const bonus = Number(data.salary?.bonus ?? 0);
      return {
        id: doc.id,
        full_name: data.full_name ?? '',
        employee_no: data.employee_no ?? '',
        salary: totalSalary,
        bonus: bonus,
        department: data.department ?? '',
        office: data.office ?? '',
        birth: data.birth_date ?? '',
        gender: data.gender ?? '',
        address: data.address ?? '',
        myNumber: data.employee_no ?? '',
        employmentType: data.employmentType ?? '',
        joinDate: data.joinDate ?? '',
        leaveDate: data.leaveDate ?? ''
      } as Employee;
    });
    // 保険料計算を事前に実行しキャッシュ
    this.premiumMap = {};
    let allNoSalary = true;
    for (const e of this.employees) {
      this.premiumMap[e.employee_no] = await this.calcPremium(e);
      // 給与情報の有無を判定
      const salaryDocId = `${e.employee_no}_${this.selectedSalaryMonth}`;
      const salarySnap = await getDocs(
        query(collection(this.firestore, 'salaries'), where('__name__', '==', salaryDocId))
      );
      if (!salarySnap.empty) {
        allNoSalary = false;
      }
    }
    // 検索結果が空かどうかでフラグをセット
    if (this.employees.length === 0) {
      this.noEmployeeFound = true;
    } else {
      this.noEmployeeFound = false;
      if (allNoSalary) {
        this.salaryNotFoundMessage = '対象月の給与情報はありません';
      }
    }
    this.employees = this.employees.sort((a, b) => a.employee_no.localeCompare(b.employee_no, 'ja'));
    this.loading = false;
  }

  // 従業員ごとの計算結果を返す
  async calcPremium(e: Employee) {
    if (!this.selectedSalaryMonth) {
      return {
        grade: '',
        standard: '',
        healthCompany: '',
        healthPersonal: '',
        careCompany: '',
        carePersonal: '',
        pensionCompany: '',
        pensionPersonal: '',
        careError: '給与計算月未選択',
        salary: ''
      };
    }
    console.log('grades:', this.grades);
    console.log('rates:', this.rates);
    console.log('year:', this.year, 'prefecture:', this.prefecture);
    console.log('employee:', e);
    // 給与取得（salariesコレクションから）
    let salary = 0;
    if (e.employee_no && this.selectedSalaryMonth) {
      try {
        const salarySnap = await getDocs(
          query(
            collection(this.firestore, 'salaries'),
            where('employee_no', '==', e.employee_no),
            where('salary_date', '==', this.selectedSalaryMonth)
          )
        );
        if (!salarySnap.empty) {
          const salaryDoc = salarySnap.docs[0];
          salary = Number(salaryDoc.data()['salary']) || 0;
        }
      } catch (err) {
        salary = 0; // エラー時も0
      }
    }
    // 等級判定
    const grade = this.grades.find(g => salary >= g.lower_limit && salary < g.upper_limit);
    // 標準報酬月額
    const standard = grade ? grade.standard : 0;
    // 給与計算月の値をDate型に変換
    let premiumMonth: Date | null = null;
    if (this.selectedSalaryMonth) {
      const [y, m] = this.selectedSalaryMonth.split('-').map(Number);
      premiumMonth = new Date(y, m - 1, 1);
    }
    // 日付だけで比較する関数
    function toYMD(date: Date) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    if (premiumMonth) {
      const salaryYMD = toYMD(premiumMonth);
      console.log('salaryMonthDate:', salaryYMD);
      this.rates.forEach(r => {
        const start = toYMD(new Date(r.effective_start_date));
        const end = toYMD(new Date(r.effective_end_date));
        console.log(
          '都道府県:', r.prefecture_name,
          'start:', start,
          'end:', end,
          'salaryMonthDate:', salaryYMD,
          'start<=salaryMonthDate:', start.getTime() <= salaryYMD.getTime(),
          'salaryMonthDate<=end:', salaryYMD.getTime() <= end.getTime(),
          '都道府県一致:', r.prefecture_name === this.prefecture
        );
      });
    }
    // 事業所の都道府県を取得
    let officePrefecture = '';
    if (e.office && this.officesForm.length > 0) {
      const officeInfo = this.officesForm.find(o => o.officeName === e.office);
      officePrefecture = officeInfo ? officeInfo.prefecture : '';
    }
    // 保険料率（事業所都道府県・適用期間でフィルタ）
    const rate = this.rates.find(r => {
      const start = toYMD(new Date(r.effective_start_date));
      const end = toYMD(new Date(r.effective_end_date));
      const salaryYMD = premiumMonth ? toYMD(premiumMonth) : null;
      return (
        r.prefecture_name === officePrefecture &&
        salaryYMD &&
        start.getTime() <= salaryYMD.getTime() &&
        salaryYMD.getTime() <= end.getTime()
      );
    });
    // 安全な数値変換
    const safeNumber = (v: any) => {
      if (typeof v === 'number' && isFinite(v)) return v;
      if (typeof v === 'string' && !isNaN(Number(v))) return Number(v);
      return 0;
    };
    // 年齢計算（給与計算月の月初日時点で）
    let age = 0;
    if (e.birth && this.selectedSalaryMonth) {
      const birthDate = new Date(e.birth);
      const [salaryYear, salaryMonth] = this.selectedSalaryMonth.split('-').map(Number);
      const baseDate = new Date(salaryYear, salaryMonth - 1, 1); // 月初
      age = baseDate.getFullYear() - birthDate.getFullYear();
      const m = baseDate.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && baseDate.getDate() < birthDate.getDate())) {
        age--;
      }
    }
    // 健康保険
    const healthCompany = rate ? Math.round((safeNumber(standard) * safeNumber(rate.health_insurance_rate_employer) / 100) * 10) / 10 : 0;
    const healthPersonal = rate ? Math.round((safeNumber(standard) * safeNumber(rate.health_insurance_rate_employee) / 100) * 10) / 10 : 0;
    // 会社情報の支払いタイミングを仮で'当月'とする（本来はFirestoreから取得）
    const paymentTiming: string = '当月'; // TODO: Firestoreから取得
    // 介護保険料の発生判定
    let careError = '';
    let careCompany = 0;
    let carePersonal = 0;
    if (!e.birth) {
      careError = '生年月日未入力';
    } else if (!premiumMonth) {
      careError = '給与計算月未選択';
    } else {
      const birthDate = new Date(e.birth);
      // 40歳の誕生日の前日
      const age40Date = new Date(birthDate.getFullYear() + 40, birthDate.getMonth(), birthDate.getDate() - 1);
      // その前日の属する月
      const age40Month = new Date(age40Date.getFullYear(), age40Date.getMonth(), 1);
      // その前月
      const careStartMonth = new Date(age40Month.getFullYear(), age40Month.getMonth() - 1, 1);
      // 65歳到達月の前月
      const age65Date = new Date(birthDate.getFullYear() + 65, birthDate.getMonth(), birthDate.getDate() - 1);
      const age65Month = new Date(age65Date.getFullYear(), age65Date.getMonth(), 1);
      // premiumMonthがcareStartMonth以上かつage65Month未満なら介護保険料を計算
      if (premiumMonth >= careStartMonth && premiumMonth < age65Month) {
        careCompany = rate ? Math.round((safeNumber(standard) * safeNumber(rate.care_insurance_rate_employer) / 100) * 10) / 10 : 0;
        carePersonal = rate ? Math.round((safeNumber(standard) * safeNumber(rate.care_insurance_rate_employee) / 100) * 10) / 10 : 0;
      } else {
        careCompany = 0;
        carePersonal = 0;
      }
    }
    // 厚生年金
    const pensionCompany = rate ? Math.round((safeNumber(standard) * safeNumber(rate.pension_insurance_rate_employer) / 100) * 100) / 100 : 0;
    const pensionPersonal = rate ? Math.round((safeNumber(standard) * safeNumber(rate.pension_insurance_rate_employee) / 100) * 100) / 100 : 0;
    const premium = {
      grade: safeNumber(grade && grade.grade),
      standard: safeNumber(standard),
      healthCompany: safeNumber(healthCompany),
      healthPersonal: safeNumber(healthPersonal),
      careCompany: safeNumber(careCompany),
      carePersonal: safeNumber(carePersonal),
      pensionCompany: safeNumber(pensionCompany),
      pensionPersonal: safeNumber(pensionPersonal),
      careError,
      salary: safeNumber(salary)
    };
    console.log('premium:', premium);
    return premium;
  }

  goHome() {
    this.router.navigate(['/home']);
  }
} 