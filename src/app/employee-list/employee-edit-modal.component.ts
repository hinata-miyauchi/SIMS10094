import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { setDoc, doc } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-employee-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-edit-modal.component.html',
  styleUrls: ['./employee-edit-modal.component.scss']
})
export class EmployeeEditModalComponent {
  @Input() employee: any;
  @Input() show = false;
  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();
  @Input() officeNameList: string[] = [];
  formErrorMessage = '';
  subTabIndex = 0;
  loading = false;

  constructor(private firestore: Firestore) {}

  async onSave() {
    // バリデーションは従業員登録画面のvalidateEmployeeロジックを流用
    const errors = this.validateEmployee(this.employee);
    if (errors.length > 0) {
      this.formErrorMessage = errors.join('、');
      return;
    }
    this.formErrorMessage = '';
    this.loading = true;
    await setDoc(doc(this.firestore, 'employees', this.employee.employee_no), this.employee, { merge: true });
    this.loading = false;
    this.updated.emit();
    this.close.emit();
  }

  onCancel() {
    this.close.emit();
  }

  validateEmployee(employee: any): string[] {
    const errors: string[] = [];
    const requiredFields = [
      'employee_no','last_name','first_name','last_name_kana','first_name_kana','birth_date','gender','nationality',
      'has_dependents','has_disability','has_overseas','status','hire_date','office','employment_type',
      'employment_expectation','scheduled_working_hours','expected_monthly_income','address','phone_number','my_number'
    ];
    requiredFields.forEach(field => {
      if (!employee[field]) errors.push(`${this.fieldNameToLabel(field)}がありません`);
    });
    // 区分の必須チェック
    if ((employee.employment_type === 'パート・アルバイト' || employee.employment_type === '有給インターン') && !employee.employment_type_detail) {
      errors.push('区分がありません');
    }
    // 半角数字のみチェック
    const onlyNumberFields = ['my_number','employee_no','scheduled_working_hours','expected_monthly_income','phone_number'];
    onlyNumberFields.forEach(field => {
      if (employee[field] && !/^[0-9]+$/.test(employee[field])) errors.push(`${this.fieldNameToLabel(field)}は半角数字のみ入力してください`);
    });
    // 半角英数字とハイフンのみチェック
    const onlyAlnumHyphenFields = ['health_insurance_no','pension_insurance_no','basic_pension_no'];
    onlyAlnumHyphenFields.forEach(field => {
      if (employee[field] && !/^[A-Za-z0-9\-]+$/.test(employee[field])) errors.push(`${this.fieldNameToLabel(field)}は半角英数字とハイフンのみ入力してください`);
    });
    // 海外勤務時の雇用形態・赴任開始日・社会保障協定国の必須チェック
    if (employee.has_overseas === 'あり' || employee.has_overseas === true || employee.has_overseas === 'true') {
      if (!employee.overseas_employment_type) errors.push('海外勤務時の雇用形態がありません');
      if (!employee.overseas_assignment_start) errors.push('赴任開始日がありません');
      if (employee.overseas_employment_type === '日本法人雇用' && !employee.is_social_security_agreement) {
        errors.push('社会保障協定国であるかがありません');
      }
    }
    if (employee.status === '退職' && !employee.retirement_date) {
      errors.push('退社年月日がありません');
    }
    return errors;
  }

  fieldNameToLabel(field: string): string {
    const map: any = {
      employee_no: '社員番号', last_name: '姓', first_name: '名', last_name_kana: '姓（カナ）', first_name_kana: '名（カナ）',
      birth_date: '生年月日', gender: '性別', nationality: '国籍', has_dependents: '扶養者の有無', has_disability: '障がいの有無',
      has_overseas: '海外勤務の有無', status: '在籍状況', hire_date: '入社年月日', retirement_date: '退社年月日', office: '所属事業所',
      employment_type: '雇用形態', employment_type_detail: '区分', employment_expectation: '雇用見込み', scheduled_working_hours: '所定労働時間',
      expected_monthly_income: '見込み月収', address: '現住所', phone_number: '電話番号', my_number: 'マイナンバー',
      health_insurance_no: '健康保険被保険者番号', pension_insurance_no: '厚生年金被保険者番号', basic_pension_no: '基礎年金番号',
      qualification_acquisition_date: '資格取得日', qualification_loss_date: '資格喪失日', overseas_employment_type: '海外勤務時の雇用形態', is_social_security_agreement: '社会保障協定国であるか', overseas_assignment_start: '赴任開始日', overseas_assignment_end: '赴任終了日（予定日）'
    };
    return map[field] || field;
  }
} 