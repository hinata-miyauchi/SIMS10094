import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Firestore, collection, getDocs, query, where, setDoc, doc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { SocialInsuranceStatusEditModalComponent } from './social-insurance-status-edit-modal.component';
import { FormsModule } from '@angular/forms';

interface SocialInsuranceStatus {
  employeeNo: string;
  name: string;
  status: string;
  healthInsurance: boolean;
  nursingCareInsurance: boolean;
  pension: boolean;
  remarks?: string;
  manualInsuranceEdit: boolean;
}

interface Employee {
  employee_no: string;
  full_name: string;
  status: string;
  leave_reason?: string;
  employment_type: string;
  scheduled_working_hours?: number;
  scheduled_working_days?: number;
  employment_expectation?: string;
  expected_monthly_income?: number;
  employment_type_detail?: string;
  birth_date?: string;
  healthInsurance: boolean;
  nursingCareInsurance: boolean;
  pension: boolean;
  manualInsuranceEdit: boolean;
  overseas_employment_type?: string;
  health_insurance_acquisition_date?: string;
  pension_acquisition_date?: string;
  has_dependents?: string;
  is_social_security_agreement?: string;
  assignment_period?: string;
}

@Component({
  selector: 'app-social-insurance-status',
  standalone: true,
  imports: [CommonModule, FormsModule, SocialInsuranceStatusEditModalComponent],
  templateUrl: './social-insurance-status.component.html',
  styleUrls: ['./social-insurance-status.component.scss']
})
export class SocialInsuranceStatusComponent implements OnInit {
  statuses: SocialInsuranceStatus[] = [];
  filteredStatuses: SocialInsuranceStatus[] = [];
  pagedStatuses: SocialInsuranceStatus[] = [];
  currentPage: number = 1;
  pageSize: number = 25;
  totalPages: number = 1;
  searchEmployeeNo: string = '';
  pendingSearchEmployeeNo: string = '';
  loading = false;
  errorMessage: string = '';
  editModalOpen = false;
  editTarget: SocialInsuranceStatus | null = null;

  constructor(private router: Router, private firestore: Firestore, private auth: Auth) {}

  async ngOnInit() {
    this.loading = true;
    const uid = this.auth.currentUser?.uid;
    if (!uid) { this.loading = false; return; }
    // 会社情報取得
    const companySnap = await getDocs(query(collection(this.firestore, 'company'), where('uid', '==', uid)));
    if (companySnap.empty) {
      this.errorMessage = '会社情報を取得できません。';
      this.loading = false;
      return;
    }
    const companyData = companySnap.docs[0].data();
    const weeklyWorkingHours = companyData['basic']?.['weeklyWorkingHours'];
    const monthlyWorkingDays = companyData['basic']?.['monthlyWorkingDays'];
    const isSpecifiedOffice = companyData['basic']?.['isSpecifiedOffice'];
    // 従業員情報取得
    const employeesSnap = await getDocs(query(collection(this.firestore, 'employees'), where('uid', '==', uid)));
    let employees: Employee[] = employeesSnap.docs.map(doc => doc.data() as Employee);
    // 従業員番号の昇順でソート
    employees = employees.sort((a, b) => {
      const aNo = Number(a.employee_no);
      const bNo = Number(b.employee_no);
      if (!isNaN(aNo) && !isNaN(bNo)) return aNo - bNo;
      return String(a.employee_no).localeCompare(String(b.employee_no), 'ja');
    });
    this.statuses = [];
    for (const emp of employees) {
      const { healthInsurance, nursingCareInsurance, pension, remarks } = calculateSocialInsuranceStatus(emp, companyData);
      this.statuses.push({
        employeeNo: emp.employee_no,
        name: emp.full_name,
        status: emp.status,
        healthInsurance,
        nursingCareInsurance,
        pension,
        remarks: remarks || (emp as any).remarks,
        manualInsuranceEdit: emp.manualInsuranceEdit ?? false
      } as any);
      // 判定結果をFirestoreに保存
      const uid = (emp as any).uid || (this.auth.currentUser?.uid ?? '');
      const docId = uid + '_' + emp.employee_no;
      if (emp.manualInsuranceEdit) {
        await setDoc(doc(this.firestore, 'employees', docId), {
          manualHealthInsurance: healthInsurance ?? false,
          manualNursingCareInsurance: nursingCareInsurance ?? false,
          manualPension: pension ?? false,
          manualInsuranceEdit: true,
          // 旧フィールドも後方互換で更新
          healthInsurance: healthInsurance ?? false,
          nursingCareInsurance: nursingCareInsurance ?? false,
          pension: pension ?? false
        }, { merge: true });
      } else {
        await setDoc(doc(this.firestore, 'employees', docId), {
          autoHealthInsurance: healthInsurance ?? false,
          autoNursingCareInsurance: nursingCareInsurance ?? false,
          autoPension: pension ?? false,
          manualInsuranceEdit: false,
          // 旧フィールドも後方互換で更新
          healthInsurance: healthInsurance ?? false,
          nursingCareInsurance: nursingCareInsurance ?? false,
          pension: pension ?? false
        }, { merge: true });
      }
    }
    this.filteredStatuses = [...this.statuses];
    this.currentPage = 1;
    this.updatePagedStatuses();
    this.loading = false;
    this.pendingSearchEmployeeNo = this.searchEmployeeNo;
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  onRowClick(s: SocialInsuranceStatus) {
    this.editTarget = { ...s };
    this.editModalOpen = true;
  }

  async onEditSave(data: {manualHealthInsurance: boolean, manualNursingCareInsurance: boolean, manualPension: boolean, manualInsuranceEdit: boolean}) {
    if (!this.editTarget) return;
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    const employeesSnap = await getDocs(query(collection(this.firestore, 'employees'), where('uid', '==', uid), where('employee_no', '==', this.editTarget.employeeNo)));
    if (!employeesSnap.empty) {
      const docRef = employeesSnap.docs[0].ref;
      if (data.manualInsuranceEdit) {
        await setDoc(docRef, {
          manualHealthInsurance: data.manualHealthInsurance,
          manualNursingCareInsurance: data.manualNursingCareInsurance,
          manualPension: data.manualPension,
          manualInsuranceEdit: true,
          // 旧フィールドも後方互換で更新
          healthInsurance: data.manualHealthInsurance,
          nursingCareInsurance: data.manualNursingCareInsurance,
          pension: data.manualPension
        }, { merge: true });
      } else {
        await setDoc(docRef, {
          autoHealthInsurance: data.manualHealthInsurance,
          autoNursingCareInsurance: data.manualNursingCareInsurance,
          autoPension: data.manualPension,
          manualInsuranceEdit: false,
          // 旧フィールドも後方互換で更新
          healthInsurance: data.manualHealthInsurance,
          nursingCareInsurance: data.manualNursingCareInsurance,
          pension: data.manualPension
        }, { merge: true });
      }
    }
    this.editModalOpen = false;
    this.editTarget = null;
    await this.ngOnInit();
  }

  onEditCancel() {
    this.editModalOpen = false;
    this.editTarget = null;
  }

  onSearchEmployeeNo() {
    this.searchEmployeeNo = this.pendingSearchEmployeeNo;
    const keyword = (this.searchEmployeeNo || '').trim();
    if (!keyword) {
      this.filteredStatuses = [...this.statuses];
    } else {
      this.filteredStatuses = this.statuses.filter(s => s.employeeNo.includes(keyword));
    }
    this.currentPage = 1;
    this.updatePagedStatuses();
  }

  onClearSearch() {
    this.searchEmployeeNo = '';
    this.pendingSearchEmployeeNo = '';
    this.filteredStatuses = [...this.statuses];
    this.currentPage = 1;
    this.updatePagedStatuses();
  }

  updatePagedStatuses() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredStatuses.length / this.pageSize));
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedStatuses = this.filteredStatuses.slice(start, end);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagedStatuses();
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  prevPage() {
    this.goToPage(this.currentPage - 1);
  }
}

// 社会保険自動判定ロジック（共通関数）
export function calculateSocialInsuranceStatus(emp: any, companyData: any): { healthInsurance: boolean, nursingCareInsurance: boolean, pension: boolean, remarks: string } {
  let healthInsurance: boolean = false;
  let nursingCareInsurance: boolean = false;
  let pension: boolean = false;
  let remarks = '';
  const weeklyWorkingHours = companyData['basic']?.['weeklyWorkingHours'];
  const monthlyWorkingDays = companyData['basic']?.['monthlyWorkingDays'];
  const isSpecifiedOffice = companyData['basic']?.['isSpecifiedOffice'];
  // 被扶養者本人の判定
  if ((emp as any).has_dependents === '被扶養者本人') {
    healthInsurance = false;
    nursingCareInsurance = false;
    pension = false;
    remarks = '被扶養者本人のため免除';
    return { healthInsurance, nursingCareInsurance, pension, remarks };
  }
  if (emp.status === '休職') {
    if (emp.leave_reason === '産前産後休業') {
      remarks = '産前産後休業のため免除';
    } else if (emp.leave_reason === '育児休業') {
      remarks = '育児休業のため免除';
    }
  }
  if (emp.manualInsuranceEdit) {
    healthInsurance = emp.healthInsurance;
    nursingCareInsurance = emp.nursingCareInsurance;
    pension = emp.pension;
    // 手動判定時も資格取得日未入力メッセージを追加
    let remarksArr = remarks ? [remarks] : [];
    if ((healthInsurance || nursingCareInsurance) && !emp.health_insurance_acquisition_date) {
      remarksArr.push('健康保険資格取得日が未入力です。従業員情報から登録してください。');
    }
    if (pension && !emp.pension_acquisition_date) {
      remarksArr.push('厚生年金資格取得日が未入力です。従業員情報から登録してください。');
    }
    remarks = remarksArr.join(' ');
    return { healthInsurance, nursingCareInsurance, pension, remarks };
  } else {
    // 社会保障協定国で赴任予定期間が5年超の場合は未加入（備考は空欄のまま）
    if (emp.is_social_security_agreement === 'はい' && emp.assignment_period === '5年超') {
      healthInsurance = false;
      nursingCareInsurance = false;
      pension = false;
      remarks = '';
      return { healthInsurance, nursingCareInsurance, pension, remarks };
    }
    // 海外現地法人雇用は保険対象外
    if (emp.overseas_employment_type === '現地法人雇用') {
      healthInsurance = false;
      nursingCareInsurance = false;
      pension = false;
      return { healthInsurance, nursingCareInsurance, pension, remarks };
    } else {
      let isActive = false;
      if (emp.status === '在籍') {
        isActive = true;
      } else if (emp.status === '休職') {
        if (emp.leave_reason !== '育児休業' && emp.leave_reason !== '産前産後休業') {
          isActive = true;
        }
      }
      if (isActive) {
        if (emp.employment_type === '正社員') {
          healthInsurance = true;
          nursingCareInsurance = true;
          pension = true;
        } else if (emp.employment_type === '個人事業主') {
          healthInsurance = false;
          nursingCareInsurance = false;
          pension = false;
        } else if ([
          '契約社員',
          '嘱託社員',
          'パート・アルバイト',
          '有給インターン'
        ].includes(emp.employment_type)) {
          const empHours = emp.scheduled_working_hours ?? 0;
          const empDays = emp.scheduled_working_days ?? 0;
          const hoursThreshold = weeklyWorkingHours * 0.75;
          const daysThreshold = monthlyWorkingDays * 0.75;
          if (empHours >= hoursThreshold && empDays >= daysThreshold) {
            // 3/4基準クリア → 学生でも加入
            healthInsurance = true;
            nursingCareInsurance = true;
            pension = true;
          } else {
            const cond1 = (emp.scheduled_working_hours ?? 0) >= 20;
            const cond2 = emp.employment_expectation === '2か月超';
            const cond3 = (emp.expected_monthly_income ?? 0) >= 88000;
            const cond4 = !emp.employment_type_detail || emp.employment_type_detail === '非学生・休学/夜間/通信制学生';
            const cond5 = isSpecifiedOffice === 'はい';
            if (cond1 && cond2 && cond3 && cond4 && cond5) {
              healthInsurance = true;
              nursingCareInsurance = true;
              pension = true;
            } else {
              healthInsurance = false;
              nursingCareInsurance = false;
              pension = false;
            }
          }
        }
      }
      // 年齢による最終判定
      if (healthInsurance || nursingCareInsurance || pension) {
        if (emp.birth_date) {
          const today = new Date();
          const birth = new Date(emp.birth_date);
          // 健康保険: 75歳の誕生日が属する月までtrue
          const seventyFive = new Date(birth);
          seventyFive.setFullYear(seventyFive.getFullYear() + 75);
          const seventyFiveMonth = new Date(seventyFive.getFullYear(), seventyFive.getMonth(), 1);
          const healthEnd = new Date(seventyFiveMonth.getFullYear(), seventyFiveMonth.getMonth() + 1, 0); // 75歳誕生月の末日
          if (today > healthEnd) healthInsurance = false;

          // 介護保険: 40歳の誕生日の前日が属する月から65歳の誕生日の前日が属する月までtrue
          const forty = new Date(birth);
          forty.setFullYear(forty.getFullYear() + 40);
          const fortyPrev = new Date(forty);
          fortyPrev.setDate(fortyPrev.getDate() - 1);
          const fortyMonth = new Date(fortyPrev.getFullYear(), fortyPrev.getMonth(), 1);

          const sixtyFive = new Date(birth);
          sixtyFive.setFullYear(sixtyFive.getFullYear() + 65);
          const sixtyFivePrev = new Date(sixtyFive);
          sixtyFivePrev.setDate(sixtyFivePrev.getDate() - 1);
          const sixtyFiveMonth = new Date(sixtyFivePrev.getFullYear(), sixtyFivePrev.getMonth(), 1);

          const nowMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          if (nowMonth < fortyMonth || nowMonth > sixtyFiveMonth) nursingCareInsurance = false;

          // 厚生年金: 70歳の誕生日の前日が属する月までtrue
          const seventy = new Date(birth);
          seventy.setFullYear(seventy.getFullYear() + 70);
          const seventyPrev = new Date(seventy);
          seventyPrev.setDate(seventyPrev.getDate() - 1); // 70歳の誕生日の前日
          const seventyPrevMonth = new Date(seventyPrev.getFullYear(), seventyPrev.getMonth(), 1);
          const pensionEnd = new Date(seventyPrevMonth.getFullYear(), seventyPrevMonth.getMonth() + 1, 0); // その月の末日
          if (today > pensionEnd) pension = false;
        }
      }
    }
  }
  // 資格取得日未入力時の備考メッセージ追加
  let remarksArr = remarks ? [remarks] : [];
  if ((healthInsurance || nursingCareInsurance) && !emp.health_insurance_acquisition_date) {
    remarksArr.push('健康保険資格取得日が未入力です。従業員情報から登録してください。');
  }
  if (pension && !emp.pension_acquisition_date) {
    remarksArr.push('厚生年金資格取得日が未入力です。従業員情報から登録してください。');
  }
  remarks = remarksArr.join(' ');
  return { healthInsurance, nursingCareInsurance, pension, remarks };
} 