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
    const employeeCount = companyData['basic']?.['employeeCount'];
    // 従業員情報取得
    const employeesSnap = await getDocs(query(collection(this.firestore, 'employees'), where('uid', '==', uid)));
    const employees: Employee[] = employeesSnap.docs.map(doc => doc.data() as Employee);
    this.statuses = [];
    for (const emp of employees) {
      let healthInsurance: boolean = false;
      let nursingCareInsurance: boolean = false;
      let pension: boolean = false;
      if (emp.manualInsuranceEdit) {
        healthInsurance = emp.healthInsurance;
        nursingCareInsurance = emp.nursingCareInsurance;
        pension = emp.pension;
      } else {
        // 学生（昼間部学生）は保険対象外
        if (emp.employment_type_detail === '昼間部学生') {
          healthInsurance = false;
          nursingCareInsurance = false;
          pension = false;
        } else {
          // 判定1: 在籍 or 休職（育休・産休除く）
          let isActive = false;
          if (emp.status === '在籍') {
            isActive = true;
          } else if (emp.status === '休職') {
            if (emp.leave_reason !== '育児休業' && emp.leave_reason !== '産前産後休業') {
              isActive = true;
            }
          }
          // 判定2: employment_typeによる保険判定
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
              // 判定3
              const empHours = emp.scheduled_working_hours ?? 0;
              const empDays = emp.scheduled_working_days ?? 0;
              const hoursThreshold = weeklyWorkingHours * 0.75;
              const daysThreshold = monthlyWorkingDays * 0.75;
              if (empHours >= hoursThreshold && empDays >= daysThreshold) {
                healthInsurance = true;
                nursingCareInsurance = true;
                pension = true;
              } else {
                // 判定4
                const cond1 = (emp.scheduled_working_hours ?? 0) >= 20;
                const cond2 = emp.employment_expectation === '2か月超';
                const cond3 = (emp.expected_monthly_income ?? 0) >= 88000;
                const cond4 = !emp.employment_type_detail || emp.employment_type_detail === '非学生・休学/夜間/通信制学生';
                const cond5 = employeeCount >= 51;
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
          // 判定5: 年齢・月による最終判定
          if (healthInsurance || nursingCareInsurance || pension) {
            if (emp.birth_date) {
              const today = new Date();
              const birth = new Date(emp.birth_date);
              // 健康保険: 75歳の誕生日が属する月の前月までtrue
              const seventyFive = new Date(birth);
              seventyFive.setFullYear(seventyFive.getFullYear() + 75);
              const seventyFiveMonth = new Date(seventyFive.getFullYear(), seventyFive.getMonth(), 1);
              const healthLimit = new Date(seventyFiveMonth);
              healthLimit.setMonth(healthLimit.getMonth() - 1); // 前月
              const healthEnd = new Date(healthLimit.getFullYear(), healthLimit.getMonth() + 1, 0); // 前月末
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

              // 厚生年金: 70歳の誕生日の前日が属する前月までtrue
              const seventy = new Date(birth);
              seventy.setFullYear(seventy.getFullYear() + 70);
              const seventyPrev = new Date(seventy);
              seventyPrev.setDate(seventyPrev.getDate() - 1);
              const seventyPrevMonth = new Date(seventyPrev.getFullYear(), seventyPrev.getMonth(), 1);
              const pensionLimit = new Date(seventyPrevMonth);
              pensionLimit.setMonth(pensionLimit.getMonth() - 1); // 前月
              const pensionEnd = new Date(pensionLimit.getFullYear(), pensionLimit.getMonth() + 1, 0); // 前月末
              if (today > pensionEnd) pension = false;
            }
          }
        }
      }
      this.statuses.push({
        employeeNo: emp.employee_no,
        name: emp.full_name,
        status: emp.status,
        healthInsurance,
        nursingCareInsurance,
        pension,
        remarks: ''
      });
      // 判定結果をFirestoreに保存
      await setDoc(doc(this.firestore, 'employees', emp.employee_no), {
        healthInsurance: healthInsurance ?? false,
        nursingCareInsurance: nursingCareInsurance ?? false,
        pension: pension ?? false
      }, { merge: true });
    }
    this.filteredStatuses = [...this.statuses];
    this.currentPage = 1;
    this.updatePagedStatuses();
    this.loading = false;
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  onRowClick(s: SocialInsuranceStatus) {
    this.editTarget = { ...s };
    this.editModalOpen = true;
  }

  async onEditSave(data: {healthInsurance: boolean, nursingCareInsurance: boolean, pension: boolean, manualInsuranceEdit: boolean}) {
    if (!this.editTarget) return;
    // Firestoreのemployeesコレクションに反映
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    // employee_noで該当従業員を特定
    const employeesSnap = await getDocs(query(collection(this.firestore, 'employees'), where('uid', '==', uid), where('employee_no', '==', this.editTarget.employeeNo)));
    if (!employeesSnap.empty) {
      const docRef = employeesSnap.docs[0].ref;
      await setDoc(docRef, {
        healthInsurance: data.healthInsurance,
        nursingCareInsurance: data.nursingCareInsurance,
        pension: data.pension,
        manualInsuranceEdit: data.manualInsuranceEdit
      }, { merge: true });
    }
    this.editModalOpen = false;
    this.editTarget = null;
    await this.ngOnInit(); // 一覧再取得
  }

  onEditCancel() {
    this.editModalOpen = false;
    this.editTarget = null;
  }

  onSearchEmployeeNo() {
    const keyword = (this.searchEmployeeNo || '').trim();
    if (!keyword) {
      this.filteredStatuses = [...this.statuses];
      this.currentPage = 1;
      this.updatePagedStatuses();
      return;
    }
    this.filteredStatuses = this.statuses.filter(s => s.employeeNo.includes(keyword));
    this.currentPage = 1;
    this.updatePagedStatuses();
  }

  onClearSearch() {
    this.searchEmployeeNo = '';
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