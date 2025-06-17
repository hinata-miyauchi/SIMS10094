import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Firestore, collection, getDocs, DocumentData, query, where } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { calculateSocialInsuranceStatus } from '../social-insurance-status/social-insurance-status.component';

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
  healthInsurance?: boolean;
  nursingCareInsurance?: boolean;
  pension?: boolean;
  manualInsuranceEdit?: boolean;
  autoHealthInsurance?: boolean;
  autoNursingCareInsurance?: boolean;
  autoPension?: boolean;
  manualHealthInsurance?: boolean;
  manualNursingCareInsurance?: boolean;
  manualPension?: boolean;
  remarks?: string;
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
  pendingSalaryYear: string = '';
  pendingSalaryMonthOnly: string = '';

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
    this.pendingSalaryYear = this.selectedSalaryYear;
    this.pendingSalaryMonthOnly = this.selectedSalaryMonthOnly;
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
    // 会社情報（uidで絞り込む）
    const companySnap = await getDocs(query(collection(this.firestore, 'company'), where('uid', '==', uid)));
    const companyDoc = companySnap.docs[0];
    let prefectureList: string[] = [];
    if (companyDoc) {
      const companyData = companyDoc.data();
      this.officesForm = companyData['officesForm'] || [];
      // 事業所で使われている都道府県名リストを作成
      prefectureList = this.officesForm.map((o: any) => o.prefecture).filter((v: string | undefined) => !!v);
      // 重複除去
      prefectureList = Array.from(new Set(prefectureList));
    }
    // 保険料率マスタ（事業所都道府県のみ取得）
    this.rates = [];
    if (prefectureList.length > 0) {
      // Firestoreのinクエリは10件までなので分割
      for (let i = 0; i < prefectureList.length; i += 10) {
        const chunk = prefectureList.slice(i, i + 10);
        const rateSnap = await getDocs(query(collection(this.firestore, 'insuranceRates'), where('prefecture_name', 'in', chunk)));
        this.rates.push(...rateSnap.docs.map(doc => doc.data() as Rate));
      }
    } else {
      // 事業所都道府県が取得できない場合は全件取得（従来通り）
      const rateSnap = await getDocs(collection(this.firestore, 'insuranceRates'));
      this.rates = rateSnap.docs.map(doc => doc.data() as Rate);
    }
    // 初期表示時に自動検索
    await this.searchEmployeesByNo();
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
    // 社員番号未入力かつ給与計算年月が指定されている場合
    if (!this.searchEmployeeNo && this.selectedSalaryMonth) {
      const salarySnap = await getDocs(query(collection(this.firestore, 'salaries'), where('uid', '==', uid)));
      // 今月分の給与データがある従業員番号リストを抽出
      const matchedSalaries = salarySnap.docs.filter(doc => doc.data()['salary_date'] === this.selectedSalaryMonth);
      const employeeNos = matchedSalaries.map(doc => doc.data()['employee_no']);
      if (employeeNos.length === 0) {
        this.noEmployeeFound = true;
        this.loading = false;
        return;
      }
      // 社員情報をまとめて取得
      const employeesSnap = await getDocs(query(collection(this.firestore, 'employees'), where('uid', '==', uid)));
      // 今月分の給与データがある従業員のみ抽出
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
            leaveDate: data.leaveDate ?? '',
            healthInsurance: data.healthInsurance ?? false,
            nursingCareInsurance: data.nursingCareInsurance ?? false,
            pension: data.pension ?? false,
            manualInsuranceEdit: data.manualInsuranceEdit ?? false,
            autoHealthInsurance: data.autoHealthInsurance ?? data.healthInsurance ?? false,
            autoNursingCareInsurance: data.autoNursingCareInsurance ?? data.nursingCareInsurance ?? false,
            autoPension: data.autoPension ?? data.pension ?? false,
            manualHealthInsurance: data.manualHealthInsurance ?? data.healthInsurance ?? false,
            manualNursingCareInsurance: data.manualNursingCareInsurance ?? data.nursingCareInsurance ?? false,
            manualPension: data.manualPension ?? data.pension ?? false
          } as Employee;
        })
        // 今月分の給与データがある従業員のみフィルタ
        .filter(e => employeeNos.includes(e.employee_no))
        // 社会保険フラグが全てfalseの人は除外
        .filter(e => e.healthInsurance || e.nursingCareInsurance || e.pension)
        // 従業員番号の昇順でソート
        .sort((a, b) => {
          const aNo = Number(a.employee_no);
          const bNo = Number(b.employee_no);
          if (!isNaN(aNo) && !isNaN(bNo)) return aNo - bNo;
          return String(a.employee_no).localeCompare(String(b.employee_no), 'ja');
        });
      // 保険料計算キャッシュ
      this.premiumMap = {};
      for (const e of this.employees) {
        let bonus = 0;
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
              bonus = Number(salaryDoc.data()['bonus']) || 0;
            }
          } catch (err) {
            bonus = 0;
          }
        }
        e.bonus = bonus;
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
    this.employees = snap.docs
      .map(doc => {
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
          leaveDate: data.leaveDate ?? '',
          healthInsurance: data.healthInsurance ?? false,
          nursingCareInsurance: data.nursingCareInsurance ?? false,
          pension: data.pension ?? false,
          manualInsuranceEdit: data.manualInsuranceEdit ?? false,
          autoHealthInsurance: data.autoHealthInsurance ?? data.healthInsurance ?? false,
          autoNursingCareInsurance: data.autoNursingCareInsurance ?? data.nursingCareInsurance ?? false,
          autoPension: data.autoPension ?? data.pension ?? false,
          manualHealthInsurance: data.manualHealthInsurance ?? data.healthInsurance ?? false,
          manualNursingCareInsurance: data.manualNursingCareInsurance ?? data.nursingCareInsurance ?? false,
          manualPension: data.manualPension ?? data.pension ?? false
        } as Employee;
      })
      // 社会保険フラグが全てfalseの人は除外
      .filter(e => e.healthInsurance || e.nursingCareInsurance || e.pension);
    // 保険料計算を事前に実行しキャッシュ
    this.premiumMap = {};
    let allNoSalary = true;
    for (const e of this.employees) {
      let bonus = 0;
      if (e.employee_no && this.selectedSalaryMonth) {
        try {
          const uid = this.auth.currentUser?.uid;
          const salarySnap = await getDocs(
            query(
              collection(this.firestore, 'salaries'),
              where('employee_no', '==', e.employee_no),
              where('salary_date', '==', this.selectedSalaryMonth),
              where('uid', '==', uid)
            )
          );
          if (!salarySnap.empty) {
            const salaryDoc = salarySnap.docs[0];
            bonus = Number(salaryDoc.data()['bonus']) || 0;
          }
        } catch (err) {
          bonus = 0;
        }
      }
      e.bonus = bonus;
      this.premiumMap[e.employee_no] = await this.calcPremium(e);
      // 給与情報の有無を判定
      const salarySnap = await getDocs(
        query(
          collection(this.firestore, 'salaries'),
          where('employee_no', '==', e.employee_no),
          where('salary_date', '==', this.selectedSalaryMonth),
          where('uid', '==', uid)
        )
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
    // 会社情報取得
    const uid = this.auth.currentUser?.uid;
    let companyData = {};
    if (uid) {
      const companySnap = await getDocs(query(collection(this.firestore, 'company'), where('uid', '==', uid)));
      if (!companySnap.empty) {
        companyData = companySnap.docs[0].data();
      }
    }
    // 社会保険自動判定
    if (!e.manualInsuranceEdit) {
      const result = calculateSocialInsuranceStatus(e, companyData);
      e.healthInsurance = result.healthInsurance;
      e.nursingCareInsurance = result.nursingCareInsurance;
      e.pension = result.pension;
      e.remarks = result.remarks;
    }
    let isManual = false;
    let message = '';
    let careError = '';
    // まず自動判定値で保険料を仮計算
    const autoHealth = e.autoHealthInsurance;
    const autoCare = e.autoNursingCareInsurance;
    const autoPension = e.autoPension;
    const manualHealth = e.manualHealthInsurance;
    const manualCare = e.manualNursingCareInsurance;
    const manualPension = e.manualPension;
    let useHealth = autoHealth;
    let useCare = autoCare;
    let usePension = autoPension;
    if ((e as any).manualInsuranceEdit) {
      useHealth = manualHealth;
      useCare = manualCare;
      usePension = manualPension;
    }
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
        salary: '',
        isManual,
        message
      };
    }
    // 給与取得（salariesコレクションから）
    let salary = 0;
    let bonus = 0;
    let bonusMonth = '';
    if (e.employee_no && this.selectedSalaryMonth) {
      try {
        const uid = this.auth.currentUser?.uid;
        const salarySnap = await getDocs(
          query(
            collection(this.firestore, 'salaries'),
            where('employee_no', '==', e.employee_no),
            where('salary_date', '==', this.selectedSalaryMonth),
            where('uid', '==', uid)
          )
        );
        if (!salarySnap.empty) {
          const salaryDoc = salarySnap.docs[0];
          salary = Number(salaryDoc.data()['expected_fixed_salary']) || 0;
          bonus = Number(salaryDoc.data()['bonus']) || 0;
          bonusMonth = salaryDoc.data()['salary_date'] || '';
        }
      } catch (err) {
        salary = 0; // エラー時も0
      }
    }
    // 標準賞与額（千円未満切り捨て）
    let stdBonus = Math.floor(bonus / 1000) * 1000;
    // 健康保険・介護保険：年度累計573万円上限
    let bonusYear = 0;
    if (bonusMonth) {
      const [y, m] = bonusMonth.split('-').map(Number);
      // 4月～翌3月の年度判定
      const startYear = m >= 4 ? y : y - 1;
      // 年度内の賞与累計取得
      const bonusSnaps = await getDocs(
        query(
          collection(this.firestore, 'salaries'),
          where('employee_no', '==', e.employee_no)
        )
      );
      let total = 0;
      bonusSnaps.forEach(doc => {
        const d = doc.data();
        const date = d['salary_date'];
        if (date) {
          const [yy, mm] = date.split('-').map(Number);
          const inYear = (yy > startYear || (yy === startYear && mm >= 4)) && (yy < startYear + 1 || (yy === startYear + 1 && mm <= 3));
          if (inYear) {
            total += Math.floor((Number(d['bonus']) || 0) / 1000) * 1000;
          }
        }
      });
      bonusYear = total;
      // 健康保険・介護保険：年度累計573万円上限
      if (bonusYear > 5730000) {
        stdBonus = Math.max(0, stdBonus - (bonusYear - 5730000));
        if (stdBonus < 0) stdBonus = 0;
      }
    }
    // 厚生年金：月の上限150万円、年度上限なし
    let stdBonusPension = Math.floor(bonus / 1000) * 1000;
    if (stdBonusPension > 1500000) stdBonusPension = 1500000;
    // 等級判定
    let grade = this.grades.find(g => salary >= g.lower_limit && salary < g.upper_limit);
    if (salary >= 1355000) {
      grade = this.grades.find(g => g.grade === 50);
    }
    const standard = grade ? grade.standard : 0;
    // 健康保険・介護保険はstandardをそのまま使う
    const healthStandard = standard;
    const careStandard = standard;
    // 厚生年金の標準報酬月額
    let pensionStandard = standard;
    if (grade) {
      if (grade.grade <= 4) {
        const grade4 = this.grades.find(g => g.grade === 4);
        if (grade4) pensionStandard = grade4.standard;
      } else if (grade.grade >= 35) {
        const grade35 = this.grades.find(g => g.grade === 35);
        if (grade35) pensionStandard = grade35.standard;
      }
    }
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
      this.rates.forEach(r => {
        const start = toYMD(new Date(r.effective_start_date));
        const end = toYMD(new Date(r.effective_end_date));
        if (
          r.prefecture_name === this.prefecture &&
          salaryYMD.getTime() >= start.getTime() &&
          salaryYMD.getTime() <= end.getTime()
        ) {
          // 都道府県一致
        }
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
    // 賞与保険料計算
    const healthBonusCompany = (useHealth && rate) ? Math.floor(stdBonus * safeNumber(rate.health_insurance_rate_employer) / 100) : 0;
    const healthBonusPersonal = (useHealth && rate) ? Math.floor(stdBonus * safeNumber(rate.health_insurance_rate_employee) / 100) : 0;
    const careBonusCompany = (useCare && rate) ? Math.floor(stdBonus * safeNumber(rate.care_insurance_rate_employer) / 100) : 0;
    const careBonusPersonal = (useCare && rate) ? Math.floor(stdBonus * safeNumber(rate.care_insurance_rate_employee) / 100) : 0;
    const pensionBonusCompany = (usePension && rate) ? Math.floor(stdBonusPension * safeNumber(rate.pension_insurance_rate_employer) / 100) : 0;
    const pensionBonusPersonal = (usePension && rate) ? Math.floor(stdBonusPension * safeNumber(rate.pension_insurance_rate_employee) / 100) : 0;
    // 月額保険料＋賞与保険料
    const healthCompany = (useHealth && rate) ? Math.round((safeNumber(healthStandard) * safeNumber(rate.health_insurance_rate_employer) / 100) * 10) / 10 + healthBonusCompany : 0;
    const healthPersonal = (useHealth && rate) ? Math.round((safeNumber(healthStandard) * safeNumber(rate.health_insurance_rate_employee) / 100) * 10) / 10 + healthBonusPersonal : 0;
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
      if (premiumMonth >= careStartMonth && premiumMonth < age65Month && useCare) {
        careCompany = rate ? Math.round((safeNumber(careStandard) * safeNumber(rate.care_insurance_rate_employer) / 100) * 10) / 10 + careBonusCompany : 0;
        carePersonal = rate ? Math.round((safeNumber(careStandard) * safeNumber(rate.care_insurance_rate_employee) / 100) * 10) / 10 + careBonusPersonal : 0;
      } else {
        careCompany = 0;
        carePersonal = 0;
      }
    }
    const pensionCompany = (usePension && rate) ? Math.round((safeNumber(pensionStandard) * safeNumber(rate.pension_insurance_rate_employer) / 100) * 100) / 100 + pensionBonusCompany : 0;
    const pensionPersonal = (usePension && rate) ? Math.round((safeNumber(pensionStandard) * safeNumber(rate.pension_insurance_rate_employee) / 100) * 100) / 100 + pensionBonusPersonal : 0;

    // 差分フラグ
    let healthCompanyDiff = false, healthPersonalDiff = false, careCompanyDiff = false, carePersonalDiff = false, pensionCompanyDiff = false, pensionPersonalDiff = false;
    if ((e as any).manualInsuranceEdit) {
      // 自動判定値での保険料も計算
      const autoHealthCompany = (autoHealth && rate) ? Math.round((safeNumber(standard) * safeNumber(rate.health_insurance_rate_employer) / 100) * 10) / 10 : 0;
      const autoHealthPersonal = (autoHealth && rate) ? Math.round((safeNumber(standard) * safeNumber(rate.health_insurance_rate_employee) / 100) * 10) / 10 : 0;
      let autoCareCompany = 0, autoCarePersonal = 0;
      if (!e.birth) {
        // do nothing
      } else if (!premiumMonth) {
        // do nothing
      } else {
        const birthDate = new Date(e.birth);
        const age40Date = new Date(birthDate.getFullYear() + 40, birthDate.getMonth(), birthDate.getDate() - 1);
        const age40Month = new Date(age40Date.getFullYear(), age40Date.getMonth(), 1);
        const careStartMonth = new Date(age40Month.getFullYear(), age40Month.getMonth() - 1, 1);
        const age65Date = new Date(birthDate.getFullYear() + 65, birthDate.getMonth(), birthDate.getDate() - 1);
        const age65Month = new Date(age65Date.getFullYear(), age65Date.getMonth(), 1);
        if (premiumMonth >= careStartMonth && premiumMonth < age65Month && autoCare) {
          autoCareCompany = rate ? Math.round((safeNumber(standard) * safeNumber(rate.care_insurance_rate_employer) / 100) * 10) / 10 : 0;
          autoCarePersonal = rate ? Math.round((safeNumber(standard) * safeNumber(rate.care_insurance_rate_employee) / 100) * 10) / 10 : 0;
        } else {
          autoCareCompany = 0;
          autoCarePersonal = 0;
        }
      }
      const autoPensionCompany = (autoPension && rate) ? Math.round((safeNumber(standard) * safeNumber(rate.pension_insurance_rate_employer) / 100) * 100) / 100 : 0;
      const autoPensionPersonal = (autoPension && rate) ? Math.round((safeNumber(standard) * safeNumber(rate.pension_insurance_rate_employee) / 100) * 100) / 100 : 0;
      healthCompanyDiff = healthCompany !== autoHealthCompany;
      healthPersonalDiff = healthPersonal !== autoHealthPersonal;
      careCompanyDiff = careCompany !== autoCareCompany;
      carePersonalDiff = carePersonal !== autoCarePersonal;
      pensionCompanyDiff = pensionCompany !== autoPensionCompany;
      pensionPersonalDiff = pensionPersonal !== autoPensionPersonal;
    }
    const premium = {
      grade: safeNumber(grade && grade.grade),
      standard: safeNumber(standard),
      healthCompany: safeNumber(healthCompany),
      healthPersonal: safeNumber(healthPersonal),
      careCompany: safeNumber(careCompany),
      carePersonal: safeNumber(carePersonal),
      pensionCompany: safeNumber(pensionCompany),
      pensionPersonal: safeNumber(pensionPersonal),
      healthTotal: safeNumber(healthCompany) + safeNumber(healthPersonal),
      careTotal: safeNumber(careCompany) + safeNumber(carePersonal),
      pensionTotal: safeNumber(pensionCompany) + safeNumber(pensionPersonal),
      bonus: safeNumber(bonus),
      careError,
      salary: safeNumber(salary),
      healthCompanyDiff,
      healthPersonalDiff,
      careCompanyDiff,
      carePersonalDiff,
      pensionCompanyDiff,
      pensionPersonalDiff
    };
    return premium;
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  onSearch() {
    // 年または月が空欄ならエラー表示
    if (!this.pendingSalaryYear || !this.pendingSalaryMonthOnly) {
      this.salaryNotFoundMessage = '給与計算年および給与計算月を入力してください';
      this.employees = [];
      this.premiumMap = {};
      return;
    }
    this.salaryNotFoundMessage = '';
    // 既存の検索処理を呼ぶ
    this.selectedSalaryYear = this.pendingSalaryYear;
    this.selectedSalaryMonthOnly = this.pendingSalaryMonthOnly;
    this.updateSalaryMonth();
    this.searchEmployeesByNo();
  }

  onClearSearch() {
    this.searchEmployeeNo = '';
    this.pendingSalaryYear = '';
    this.pendingSalaryMonthOnly = '';
    this.salaryNotFoundMessage = '';
    this.employees = [];
    this.premiumMap = {};
  }
} 