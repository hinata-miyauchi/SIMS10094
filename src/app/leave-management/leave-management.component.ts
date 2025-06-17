import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Firestore, collection, getDocs, query, where, setDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { LeaveManagementEditModalComponent } from './leave-management-edit-modal.component';
import { calculateSocialInsuranceStatus } from '../social-insurance-status/social-insurance-status.component';

@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, LeaveManagementEditModalComponent],
  templateUrl: './leave-management.component.html',
  styleUrls: ['./leave-management.component.scss']
})
export class LeaveManagementComponent implements OnInit {
  leaveList: any[] = [];
  searchEmployeeNo: string = '';
  filteredLeaveList: any[] = [];
  public loading: boolean = false;
  editModalOpen: boolean = false;
  editTarget: any = null;

  constructor(private firestore: Firestore, private auth: Auth) {}

  async ngOnInit() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    this.loading = true;
    const colRef = query(collection(this.firestore, 'employees'), where('uid', '==', uid));
    const snap = await getDocs(colRef);
    const today = new Date();
    this.leaveList = snap.docs
      .map(doc => {
        const data = doc.data();
        const leaveEnd = data['leave_end'];
        let isOutOfRange = false;
        if (leaveEnd) {
          const endDate = new Date(leaveEnd);
          if (!isNaN(endDate.getTime()) && endDate < today) {
            isOutOfRange = true;
          }
        }
        return {
          employee_no: data['employee_no'],
          full_name: (data['last_name'] || '') + ' ' + (data['first_name'] || ''),
          leave_start: data['leave_start'],
          leave_end: data['leave_end'],
          leave_reason: data['leave_reason'],
          status: data['status'],
          isOutOfRange: isOutOfRange
        };
      })
      .filter(emp => emp.leave_start || emp.leave_end || emp.leave_reason || emp.status === '休職')
      .sort((a, b) => {
        const aNo = Number(a.employee_no);
        const bNo = Number(b.employee_no);
        if (!isNaN(aNo) && !isNaN(bNo)) return aNo - bNo;
        return String(a.employee_no).localeCompare(String(b.employee_no), 'ja');
      });
    this.filteredLeaveList = [...this.leaveList];
    this.loading = false;
  }

  onSearch() {
    const keyword = (this.searchEmployeeNo || '').trim();
    if (!keyword) {
      this.filteredLeaveList = [...this.leaveList];
    } else {
      this.filteredLeaveList = this.leaveList.filter(emp => emp.employee_no && emp.employee_no.includes(keyword));
    }
  }

  onClearSearch() {
    this.searchEmployeeNo = '';
    this.filteredLeaveList = [...this.leaveList];
  }

  onEditRow(leave: any) {
    this.editTarget = { ...leave };
    this.editModalOpen = true;
  }

  async onEditSave(data: any) {
    this.loading = true;
    try {
      const uid = this.auth.currentUser?.uid;
      const colRef = collection(this.firestore, 'employees');
      const q = query(colRef, where('employee_no', '==', data.employeeNo), where('uid', '==', uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        // 会社情報取得
        let companyData = {};
        if (uid) {
          const companySnap = await getDocs(query(collection(this.firestore, 'company'), where('uid', '==', uid)));
          if (!companySnap.empty) {
            companyData = companySnap.docs[0].data();
          }
        }
        // 最新の従業員データ取得
        const employeeData = snap.docs[0].data();
        // 編集内容を反映
        const mergedEmployee: any = {
          ...employeeData,
          status: data.status,
          leave_reason: data.leaveReason,
          leave_start: data.leaveStart,
          leave_end: data.leaveEnd,
          retirement_date: data.retirementDate ?? ''
        };
        // 社会保険自動判定
        if (!mergedEmployee.manualInsuranceEdit) {
          const result = calculateSocialInsuranceStatus(mergedEmployee, companyData);
          mergedEmployee.healthInsurance = result.healthInsurance;
          mergedEmployee.nursingCareInsurance = result.nursingCareInsurance;
          mergedEmployee.pension = result.pension;
          mergedEmployee.remarks = result.remarks;
        }
        await setDoc(docRef, mergedEmployee, { merge: true });
      }
      await this.ngOnInit();
    } catch (e: any) {
      alert('保存に失敗しました: ' + (e?.message || e));
    }
    this.editModalOpen = false;
    this.editTarget = null;
    this.loading = false;
  }

  onEditCancel() {
    this.editModalOpen = false;
    this.editTarget = null;
  }
} 