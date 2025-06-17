import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { setDoc, doc, getDocs, collection, query, where } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { calculateSocialInsuranceStatus } from '../social-insurance-status/social-insurance-status.component';

@Component({
  selector: 'app-employee-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-edit-modal.component.html',
  styleUrls: ['./employee-edit-modal.component.scss']
})
export class EmployeeEditModalComponent implements OnInit {
  @Input() employee: any;
  @Input() show = false;
  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();
  @Input() officeNameList: string[] = [];
  @Input() employmentTypeDetail: string[] = [
    '非学生・休学/夜間/通信制学生',
    '昼間部学生'
  ];
  formErrorMessage = '';
  subTabIndex = 0;
  loading = false;

  constructor(private firestore: Firestore, private auth: Auth) {}

  ngOnInit() {
    if (!this.employee) this.employee = {};
    if (this.employee.healthInsurance === undefined) this.employee.healthInsurance = false;
    if (this.employee.nursingCareInsurance === undefined) this.employee.nursingCareInsurance = false;
    if (this.employee.pension === undefined) this.employee.pension = false;
    if (this.employee.remarks === undefined) this.employee.remarks = '';
    if (this.employee.manualInsuranceEdit === undefined) this.employee.manualInsuranceEdit = false;
  }

  async onSave() {
    // バリデーションは従業員登録画面のvalidateEmployeeロジックを流用
    const errors = this.validateEmployee(this.employee);
    if (errors.length > 0) {
      this.formErrorMessage = errors.join('、');
      return;
    }
    this.formErrorMessage = '';
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      this.formErrorMessage = 'ログイン情報が取得できません。再度ログインしてください。';
      return;
    }
    this.employee.uid = uid;
    // 数値項目をNumber型に変換
    if (this.employee.scheduled_working_hours !== undefined) this.employee.scheduled_working_hours = Number(this.employee.scheduled_working_hours);
    if (this.employee.scheduled_working_days !== undefined) this.employee.scheduled_working_days = Number(this.employee.scheduled_working_days);
    if (this.employee.expected_monthly_income !== undefined) this.employee.expected_monthly_income = Number(this.employee.expected_monthly_income);
    // 週の所定労働時間が0または空の場合はエラー
    if (!this.employee.scheduled_working_hours || Number(this.employee.scheduled_working_hours) === 0) {
      this.formErrorMessage = '週の所定労働時間は0より大きい値を入力してください。';
      return;
    }
    // 月の所定労働日数が0または空の場合はエラー
    if (!this.employee.scheduled_working_days || Number(this.employee.scheduled_working_days) === 0) {
      this.formErrorMessage = '月の所定労働日数は0より大きい値を入力してください。';
      return;
    }
    // 標準報酬月額（見込み固定的賃金）が0または空の場合はエラー
    if (!this.employee.expected_monthly_income || Number(this.employee.expected_monthly_income) === 0) {
      this.formErrorMessage = '標準報酬月額（見込み固定的賃金）は0より大きい値を入力してください。';
      return;
    }
    // 会社情報取得・社会保険判定
    const companySnap = await getDocs(query(collection(this.firestore, 'company'), where('uid', '==', uid)));
    const companyData = !companySnap.empty ? companySnap.docs[0].data() : {};
    if (!this.employee.manualInsuranceEdit) {
      const result = calculateSocialInsuranceStatus(this.employee, companyData);
      this.employee.healthInsurance = result.healthInsurance;
      this.employee.nursingCareInsurance = result.nursingCareInsurance;
      this.employee.pension = result.pension;
      this.employee.remarks = result.remarks;
      this.employee.autoHealthInsurance = result.healthInsurance;
      this.employee.autoNursingCareInsurance = result.nursingCareInsurance;
      this.employee.autoPension = result.pension;
    }
    this.employee = this.cleanEmployeeFields(this.employee);
    this.loading = true;
    // Firestore保存前にremarksを除外
    const employeeToSave = { ...this.employee };
    // has_disability, has_overseasを必ず文字列化
    employeeToSave.has_disability = String(employeeToSave.has_disability);
    employeeToSave.has_overseas = String(employeeToSave.has_overseas);
    delete employeeToSave.remarks;
    const docId = uid + '_' + this.employee.employee_no;
    await setDoc(doc(this.firestore, 'employees', docId), employeeToSave, { merge: true });
    this.loading = false;
    this.updated.emit();
    this.close.emit();
  }

  onCancel() {
    this.formErrorMessage = '';
    this.close.emit();
  }

  validateEmployee(employee: any): string[] {
    const errors: string[] = [];
    const requiredFields = [
      'employee_no','last_name','first_name','last_name_kana','first_name_kana','birth_date','gender','nationality',
      'has_dependents','has_disability','has_overseas','status','hire_date','office','employment_type',
      'employment_expectation','scheduled_working_hours','scheduled_working_days','expected_monthly_income','address','phone_number','my_number'
    ];
    const missingFields: string[] = [];
    requiredFields.forEach(field => {
      if (!employee[field]) missingFields.push(this.fieldNameToLabel(field));
    });
    // 区分の必須チェック
    if ((employee.employment_type === 'パート・アルバイト' || employee.employment_type === '有給インターン') && !employee.employment_type_detail) {
      missingFields.push('区分');
    }
    // 海外勤務時の雇用形態・赴任開始日・社会保障協定国の必須チェック
    if (employee.has_overseas === 'あり' || employee.has_overseas === true || employee.has_overseas === 'true') {
      if (!employee.overseas_employment_type) missingFields.push('海外勤務時の雇用形態');
      if (!employee.overseas_assignment_start) missingFields.push('赴任開始日');
      if (employee.overseas_employment_type === '日本法人雇用' && !employee.is_social_security_agreement) {
        missingFields.push('社会保障協定国であるか');
      }
      // 社会保障協定国が「はい」の場合は赴任予定期間必須
      if (employee.overseas_employment_type === '日本法人雇用' && employee.is_social_security_agreement === 'はい' && !employee.assignment_period) {
        missingFields.push('赴任予定期間');
      }
    }
    if (employee.status === '退職' && !employee.retirement_date) {
      missingFields.push('退社年月日');
    }
    if (employee.status === '休職') {
      if (!employee.leave_reason) missingFields.push('休職理由');
      if (!employee.leave_start) missingFields.push('休職開始日');
      if (!employee.leave_end) missingFields.push('休職終了日');
    }
    if (missingFields.length > 0) {
      errors.push(missingFields.join('、') + 'が未入力です');
    }
    // 半角数字のみチェック
    const onlyNumberFields = ['my_number','employee_no','expected_monthly_income','phone_number'];
    onlyNumberFields.forEach(field => {
      if (employee[field] && !/^[0-9]+$/.test(employee[field])) errors.push(`${this.fieldNameToLabel(field)}は半角数字のみ入力してください`);
    });
    // 半角英数字とハイフンのみチェック
    const onlyAlnumHyphenFields = ['health_insurance_no','pension_insurance_no','basic_pension_no'];
    onlyAlnumHyphenFields.forEach(field => {
      if (employee[field] && !/^[A-Za-z0-9\-]+$/.test(employee[field])) errors.push(`${this.fieldNameToLabel(field)}は半角英数字とハイフンのみ入力してください`);
    });
    return errors;
  }

  fieldNameToLabel(field: string): string {
    const map: any = {
      employee_no: '社員番号', last_name: '姓', first_name: '名', last_name_kana: '姓（カナ）', first_name_kana: '名（カナ）',
      birth_date: '生年月日', gender: '性別', nationality: '国籍', has_dependents: '扶養者の有無', has_disability: '障がいの有無',
      has_overseas: '海外勤務の有無', status: '在籍状況', hire_date: '入社年月日', retirement_date: '退社年月日', office: '所属事業所',
      employment_type: '雇用形態', employment_type_detail: '区分', employment_expectation: '雇用見込み', scheduled_working_hours: '週の所定労働時間',
      scheduled_working_days: '月の所定労働日数', expected_monthly_income: '見込み固定的賃金', address: '現住所', phone_number: '電話番号', my_number: 'マイナンバー',
      health_insurance_no: '健康保険被保険者番号', pension_insurance_no: '厚生年金被保険者番号', basic_pension_no: '基礎年金番号',
      qualification_acquisition_date: '資格取得日', qualification_loss_date: '資格喪失日', overseas_employment_type: '海外勤務時の雇用形態', is_social_security_agreement: '社会保障協定国であるか', overseas_assignment_start: '赴任開始日', overseas_assignment_end: '赴任終了日（予定日）'
    };
    return map[field] || field;
  }

  cleanEmployeeFields(employee: any) {
    // has_disability, has_overseasを必ず文字列化
    employee.has_disability = String(employee.has_disability);
    employee.has_overseas = String(employee.has_overseas);
    // 海外勤務の有無
    if (employee.has_overseas === 'なし' || employee.has_overseas === false || employee.has_overseas === 'false') {
      employee.overseas_employment_type = '';
      employee.is_social_security_agreement = '';
      employee.assignment_period = '';
      employee.overseas_assignment_start = '';
      employee.overseas_assignment_end = '';
    }
    // 雇用形態
    if (employee.employment_type !== 'パート・アルバイト' && employee.employment_type !== '有給インターン') {
      employee.employment_type_detail = '';
    }
    // 社会保障協定国
    if (employee.is_social_security_agreement !== 'はい') {
      employee.assignment_period = '';
    }
    // 在籍状況
    if (employee.status !== '退職') {
      employee.retirement_date = '';
    }
    // 休職
    if (employee.status !== '休職') {
      employee.leave_start = '';
      employee.leave_end = '';
      employee.leave_reason = '';
    }
    // 退職
    if (employee.status !== '退職') {
      employee.retirement_date = '';
    }
    // 海外勤務時の雇用形態
    if (employee.overseas_employment_type !== '日本法人雇用') {
      employee.is_social_security_agreement = '';
      employee.assignment_period = '';
    }
    return employee;
  }
} 