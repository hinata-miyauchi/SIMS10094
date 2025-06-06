import { Component, OnInit } from '@angular/core';
import { collection, getDocs, getFirestore, query, orderBy, doc, setDoc, where } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { EmployeeEditModalComponent } from './employee-edit-modal.component';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
// Firebaseの初期化（必要に応じて環境変数に置き換えてください）
const firebaseConfig = {
  apiKey: "AIzaSyADXQFj89_ECMHUODzUkbMhoNAzHlpVu_U",
  authDomain: "sims10094.firebaseapp.com",
  projectId: "sims10094",
  storageBucket: "sims10094.appspot.com",
  messagingSenderId: "948686514904",
  appId: "1:948686514904:web:b91155f906ecd6a24685ad"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    EmployeeEditModalComponent
  ],
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.scss']
})
export class EmployeeListComponent implements OnInit {
  public mainTabIndex = 0;
  public subTabIndex = 0;
  public employeeList: any[] = [];
  public basicForm = {
    last_name: '',
    first_name: '',
    last_name_kana: '',
    first_name_kana: '',
    birth_date: '',
    gender: '',
    my_number: '',
    nationality: '',
    has_dependents: '',
    has_disability: '',
    has_overseas: '',
    overseas_employment_type: '',
    is_social_security_agreement: '',
    overseas_assignment_start: '',
    overseas_assignment_end: ''
  };
  public employmentForm = {
    status: '',
    hire_date: '',
    retirement_date: '',
    leave_start: '',
    leave_end: '',
    leave_reason: ''
  };
  public workForm = {
    employee_no: '',
    office: '',
    employment_type: '',
    scheduled_working_hours: '',
    scheduled_working_days: '',
    expected_monthly_income: '',
    employment_expectation: ''
  };
  public contactForm = {
    address: '',
    phone_number: ''
  };
  public insuranceForm = {
    health_insurance_no: '',
    pension_insurance_no: '',
    basic_pension_no: '',
    qualification_acquisition_date: '',
    qualification_loss_date: ''
  };
  public employmentTypeMain = [
    '正社員',
    '契約社員',
    '嘱託社員',
    'パート・アルバイト',
    '有給インターン',
    '個人事業主'
  ];

  public employmentTypeDetail = [
    '非学生・休学/夜間/通信制学生 ',
    '昼間部学生'
  ];

  public selectedEmploymentTypeMain: string = '';
  public selectedEmploymentTypeDetail: string = '';

  public selectedCSVFile: File | null = null;
  public importResult: string = '';
  public formErrorMessage: string = '';
  public officeNameList: string[] = [];
  public loading: boolean = false;
  private clearMessageListener: (() => void) | null = null;
  public editModalOpen = false;
  public selectedEmployee: any = null;

  constructor(
    private router: Router,
    private auth: Auth
  ) {}

  async ngOnInit(): Promise<void> {
    // uidの取得をonAuthStateChangedで確実に
    onAuthStateChanged(this.auth, async (user) => {
      if (!user) return;
      const uid = user.uid;
      const q = query(collection(db, 'employees'), where('uid', '==', uid));
      const querySnapshot = await getDocs(q);
      this.employeeList = querySnapshot.docs
        .map(doc => doc.data())
        .sort((a, b) => Number(a['employee_no']) - Number(b['employee_no']));
      // 会社情報（事業所名リスト）を取得
      const companySnap = await getDocs(collection(db, 'company'));
      const companyDoc = companySnap.docs.find(doc => doc.id === 'main');
      if (companyDoc) {
        const companyData = companyDoc.data();
        const officesForm = companyData['officesForm'] || [];
        this.officeNameList = officesForm
          .map((o: any) => o.officeName)
          .filter((name: string | undefined) => typeof name === 'string' && name.trim() !== '');
      } else {
        this.officeNameList = [];
      }
    });
  }

  downloadFormatCSV() {
    const headers = [
      '社員番号','姓','名','姓カナ','名カナ','生年月日','性別','国籍','扶養者の有無','障がいの有無','海外勤務の有無',
      '海外勤務時の雇用形態','社会保障協定国であるか','赴任開始日','赴任終了日（予定日）',
      '在籍状況','入社年月日','退社年月日',
      '所属事業所','雇用形態','雇用見込み','週の所定労働時間','月の所定労働日数','見込み固定的賃金',
      '現住所','電話番号',
      '健康保険被保険者番号','厚生年金被保険者番号','基礎年金番号','資格取得日','資格喪失日'
    ];
    const csv = headers.join(',') + '\n';
    this.downloadCSV(csv, 'employee_format.csv');
  }

  downloadSampleCSV() {
    const headers = [
      '社員番号','姓','名','姓カナ','名カナ','生年月日','性別','国籍','扶養者の有無','障がいの有無','海外勤務の有無',
      '海外勤務時の雇用形態','社会保障協定国であるか','赴任開始日','赴任終了日（予定日）',
      '在籍状況','入社年月日','退社年月日',
      '所属事業所','雇用形態','雇用見込み','週の所定労働時間','月の所定労働日数','見込み固定的賃金',
      '現住所','電話番号',
      '健康保険被保険者番号','厚生年金被保険者番号','基礎年金番号','資格取得日','資格喪失日'
    ];
    const sample = [
      '10001','山田','太郎','ヤマダ','タロウ','1990-01-01','男','日本','あり','なし','なし',
      '','','','','在籍','2020-04-01','',
      '本社','正社員','2か月超','40','250000',
      '東京都新宿区1-1-1','0312345678',
      'HI12345678','PI87654321','BP1234567890','2020-04-01',''
    ];
    const csv = headers.join(',') + '\n' + sample.join(',') + '\n';
    this.downloadCSV(csv, 'employee_sample.csv');
  }

  downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onCSVFileSelected(event: any) {
    this.selectedCSVFile = event.target.files[0] || null;
  }

  fieldNameToLabel(field: string): string {
    const map: { [key: string]: string } = {
      employee_no: '社員番号', last_name: '姓', first_name: '名', last_name_kana: '姓カナ', first_name_kana: '名カナ',
      birth_date: '生年月日', gender: '性別', nationality: '国籍', has_dependents: '扶養者の有無', has_disability: '障がいの有無',
      has_overseas: '海外勤務の有無', status: '在籍状況', hire_date: '入社年月日', office: '所属事業所', employment_type: '雇用形態',employment_type_detail: '区分',my_number: 'マイナンバー',
      employment_expectation: '雇用見込み', scheduled_working_hours: '週の所定労働時間', scheduled_working_days: '月の所定労働日数', expected_monthly_income: '見込み固定的賃金',
      address: '現住所', phone_number: '電話番号', overseas_employment_type: '海外勤務時の雇用形態', is_social_security_agreement: '社会保障協定国であるか', overseas_assignment_start: '赴任開始日', retirement_date: '退社年月日'
    };
    return map[field] || field;
  }

  normalizeValue(val: string, type: string): string {
    if (!val) return '';
    if (type === 'employment_expectation') {
      val = val.replace(/[ 　]/g, '').replace('ヶ月', 'か月').replace('２', '2').trim();
      if (val === '2か月超' || val === '2か月以内') return val;
      return '';
    }
    if (type === 'gender') {
      if (val === '男' || val === '男性') return '男';
      if (val === '女' || val === '女性') return '女';
      return '';
    }
    if (type === 'has_overseas' || type === 'has_dependents' || type === 'has_disability') {
      if (val === 'あり' || val === '有') return 'あり';
      if (val === 'なし' || val === '無') return 'なし';
      return '';
    }
    if (type === 'nationality') {
      if (val === '日本' || val === '日本国') return '日本';
      if (val === '日本以外' || val === '外国' || val === '海外') return '日本以外';
      return '';
    }
    if (type === 'status') {
      if (val === '在籍') return '在籍';
      if (val === '退職') return '退職';
      if (val === '休職') return '休職';
      return '';
    }
    return val.trim();
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
    if ((employee.employment_type && (employee.employment_type.startsWith('パート・アルバイト') || employee.employment_type.startsWith('有給インターン')))
      && !employee.employment_type_detail) {
      missingFields.push('区分');
    }
    // 海外勤務時の雇用形態・赴任開始日・社会保障協定国の必須チェック
    if (employee.has_overseas === 'あり' || employee.has_overseas === true || employee.has_overseas === 'true') {
      if (!employee.overseas_employment_type) missingFields.push('海外勤務時の雇用形態');
      if (!employee.overseas_assignment_start) missingFields.push('赴任開始日');
      if (employee.overseas_employment_type === '日本法人雇用' && !employee.is_social_security_agreement) {
        missingFields.push('社会保障協定国であるか');
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
    const onlyNumberFields = ['my_number','employee_no','scheduled_working_hours','scheduled_working_days','expected_monthly_income','phone_number'];
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

  normalizeToAlphanumeric(val: string): string {
    if (!val) return '';
    // 全角英数字→半角英数字、記号除去
    return val.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
              .replace(/[^A-Za-z0-9]/g, '');
  }

  async importCSV() {
    if (!this.selectedCSVFile) return;
    this.loading = true;
    const text = await this.selectedCSVFile.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      this.importResult = 'CSVにデータがありません。';
      this.loading = false;
      return;
    }
    const headers = lines[0].split(',');
    let success = 0, fail = 0;
    const errorsAll: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length !== headers.length) { errorsAll.push(`行${i+1}: カラム数が一致しません`); fail++; continue; }
      // full_name, full_name_kanaを明示的に追加
      const employee: any = {
        full_name: '',
        full_name_kana: ''
      };
      headers.forEach((h, idx) => employee[this.fieldNameToLabel(h)] = values[idx]);
      // 半角英数字正規化
      employee.my_number = this.normalizeToAlphanumeric(employee.my_number);
      employee.employee_no = this.normalizeToAlphanumeric(employee.employee_no);
      employee.scheduled_working_hours = this.normalizeToAlphanumeric(employee.scheduled_working_hours);
      employee.expected_monthly_income = this.normalizeToAlphanumeric(employee.expected_monthly_income);
      employee.phone_number = this.normalizeToAlphanumeric(employee.phone_number);
      employee.health_insurance_no = this.normalizeToAlphanumeric(employee.health_insurance_no);
      employee.pension_insurance_no = this.normalizeToAlphanumeric(employee.pension_insurance_no);
      employee.basic_pension_no = this.normalizeToAlphanumeric(employee.basic_pension_no);
      employee.employment_expectation = this.normalizeValue(employee.employment_expectation, 'employment_expectation');
      employee.gender = this.normalizeValue(employee.gender, 'gender');
      employee.has_overseas = this.normalizeValue(employee.has_overseas, 'has_overseas');
      employee.has_dependents = this.normalizeValue(employee.has_dependents, 'has_dependents');
      employee.has_disability = this.normalizeValue(employee.has_disability, 'has_disability');
      employee.nationality = this.normalizeValue(employee.nationality, 'nationality');
      employee.status = this.normalizeValue(employee.status, 'status');
      // full_name, full_name_kana自動生成
      employee.full_name = (employee.last_name || '') + ' ' + (employee.first_name || '');
      employee.full_name_kana = (employee.last_name_kana || '') + ' ' + (employee.first_name_kana || '');
      const errors = this.validateEmployee(employee);
      if (errors.length > 0) {
        errorsAll.push(`行${i+1}: ${errors.join('、')}`);
        fail++;
        continue;
      }
      try {
        await setDoc(doc(db, 'employees', employee.employee_no), employee);
        success++;
      } catch {
        errorsAll.push(`行${i+1}: Firestore登録エラー`);
        fail++;
      }
    }
    if (errorsAll.length > 0) {
      this.importResult = `インポート完了：${success}件成功、${fail}件失敗\n${errorsAll.join('\n')}`;
    } else {
      this.importResult = `インポート完了：${success}件成功、${fail}件失敗`;
    }
    this.selectedCSVFile = null;
    this.loading = false;
  }

  async onRegisterOrUpdate() {
    // 各フォーム値を1つの従業員オブジェクトにまとめる
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    const employee = {
      ...this.basicForm,
      ...this.employmentForm,
      ...this.workForm,
      ...this.contactForm,
      ...this.insuranceForm,
      uid,
      // full_name, full_name_kanaを明示的に追加
      full_name: (this.basicForm.last_name || '') + ' ' + (this.basicForm.first_name || ''),
      full_name_kana: (this.basicForm.last_name_kana || '') + ' ' + (this.basicForm.first_name_kana || '')
    };
    // バリデーション
    const errors = this.validateEmployee(employee);
    if (errors.length > 0) {
      this.formErrorMessage = errors.join('、');
      return;
    }
    this.formErrorMessage = '';
    // Firestore登録処理
    const employeeToSave: any = { ...employee };
    if (employeeToSave.scheduled_working_hours !== undefined) employeeToSave.scheduled_working_hours = Number(employeeToSave.scheduled_working_hours);
    if (employeeToSave.scheduled_working_days !== undefined) employeeToSave.scheduled_working_days = Number(employeeToSave.scheduled_working_days);
    if (employeeToSave.expected_monthly_income !== undefined) employeeToSave.expected_monthly_income = Number(employeeToSave.expected_monthly_income);
    await setDoc(doc(db, 'employees', employee.employee_no), employeeToSave)
      .then(() => {
        this.formErrorMessage = '登録が完了しました。';
        this.setupAutoClearMessage();
        // フォーム内容を初期化
        this.basicForm = {
          last_name: '', first_name: '', last_name_kana: '', first_name_kana: '', birth_date: '', gender: '', my_number: '', nationality: '', has_dependents: '', has_disability: '', has_overseas: '', overseas_employment_type: '', is_social_security_agreement: '', overseas_assignment_start: '', overseas_assignment_end: ''
        };
        this.employmentForm = { status: '', hire_date: '', retirement_date: '', leave_start: '', leave_end: '', leave_reason: '' };
        this.workForm = { employee_no: '', office: '', employment_type: '', scheduled_working_hours: '', scheduled_working_days: '', expected_monthly_income: '', employment_expectation: '' };
        this.contactForm = { address: '', phone_number: '' };
        this.insuranceForm = { health_insurance_no: '', pension_insurance_no: '', basic_pension_no: '', qualification_acquisition_date: '', qualification_loss_date: '' };
        this.selectedEmploymentTypeMain = '';
        this.selectedEmploymentTypeDetail = '';
      })
      .catch(() => {
        this.formErrorMessage = 'Firestoreへの登録に失敗しました。';
      });
  }

  // 半角数字のみ許可
  onInputNumberOnly(model: any, key: string) {
    if (model[key]) {
      model[key] = model[key].replace(/[^0-9]/g, '');
    }
  }
  // 半角英数字とハイフンのみ許可
  onInputAlnumHyphenOnly(model: any, key: string) {
    if (model[key]) {
      model[key] = model[key].replace(/[^A-Za-z0-9\-]/g, '');
    }
  }

  goHome() {
    this.router.navigate(['/']);
  }

  clearMessage() {
    if (this.formErrorMessage) {
      this.formErrorMessage = '';
    }
  }

  private setupAutoClearMessage() {
    if (this.clearMessageListener) return;
    const clear = () => {
      this.formErrorMessage = '';
      window.removeEventListener('click', clear, true);
      window.removeEventListener('focusin', clear, true);
      window.removeEventListener('keydown', clear, true);
      this.clearMessageListener = null;
    };
    window.addEventListener('click', clear, true);
    window.addEventListener('focusin', clear, true);
    window.addEventListener('keydown', clear, true);
    this.clearMessageListener = clear;
  }

  openEditModal(emp: any) {
    this.selectedEmployee = { ...emp };
    this.editModalOpen = true;
  }

  onEmployeeUpdated() {
    // 従業員一覧を再取得するロジックをここに記述（ngOnInit等を呼び出し）
    this.ngOnInit();
  }

  setMainTabIndex(idx: number) {
    this.mainTabIndex = idx;
    if (idx === 1) {
      this.subTabIndex = 0;
    } else {
      // 従業員登録画面の入力内容をリセット
      this.basicForm = {
        last_name: '', first_name: '', last_name_kana: '', first_name_kana: '', birth_date: '', gender: '', my_number: '', nationality: '', has_dependents: '', has_disability: '', has_overseas: '', overseas_employment_type: '', is_social_security_agreement: '', overseas_assignment_start: '', overseas_assignment_end: ''
      };
      this.employmentForm = { status: '', hire_date: '', retirement_date: '', leave_start: '', leave_end: '', leave_reason: '' };
      this.workForm = { employee_no: '', office: '', employment_type: '', scheduled_working_hours: '', scheduled_working_days: '', expected_monthly_income: '', employment_expectation: '' };
      this.contactForm = { address: '', phone_number: '' };
      this.insuranceForm = { health_insurance_no: '', pension_insurance_no: '', basic_pension_no: '', qualification_acquisition_date: '', qualification_loss_date: '' };
      this.selectedEmploymentTypeMain = '';
      this.selectedEmploymentTypeDetail = '';
      this.subTabIndex = 0;
      this.formErrorMessage = '';
    }
  }
}
