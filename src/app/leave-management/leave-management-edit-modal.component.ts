import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-leave-management-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-management-edit-modal.component.html',
  styleUrls: ['./leave-management-edit-modal.component.scss']
})
export class LeaveManagementEditModalComponent {
  @Input() employeeNo: string = '';
  @Input() fullName: string = '';
  @Input() status: string = '';
  @Input() leaveReason: string = '';
  @Input() leaveStart: string = '';
  @Input() leaveEnd: string = '';
  @Input() retirementDate: string = '';

  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  statusOptions = ['在籍', '休職', '退職'];
  leaveReasonOptions = ['産前産後休業', '育児休業', 'その他休業（病気・介護など）'];

  errorMsg: string = '';

  onSave() {
    // 必須バリデーション
    if (!this.status) {
      this.errorMsg = '在籍状況は必須です。';
      return;
    }
    if (this.status === '休職' && !this.leaveReason) {
      this.errorMsg = '休職理由は必須です。';
      return;
    }
    if (this.status === '退職' && !this.retirementDate) {
      this.errorMsg = '退社年月日は必須です。';
      return;
    }
    // 休職以外の場合は休職関連フィールドを空白に
    let leaveReason = this.leaveReason;
    let leaveStart = this.leaveStart;
    let leaveEnd = this.leaveEnd;
    if (this.status !== '休職') {
      leaveReason = '';
      leaveStart = '';
      leaveEnd = '';
    }
    this.errorMsg = '';
    this.save.emit({
      employeeNo: this.employeeNo,
      status: this.status,
      leaveReason: leaveReason,
      leaveStart: leaveStart,
      leaveEnd: leaveEnd,
      retirementDate: this.retirementDate
    });
  }

  onCancel() {
    this.cancel.emit();
  }
} 