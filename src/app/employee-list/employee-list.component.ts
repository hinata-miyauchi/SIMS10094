import { Component, OnInit } from '@angular/core';
import { collection, getDocs, getFirestore, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  imports: [CommonModule, FormsModule],
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
    retirement_date: ''
  };
  public workForm = {
    employee_no: '',
    office: '',
    employment_type: '',
    scheduled_working_hours: '',
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
    'パート・アルバイト',
    '有給インターン',
    'その他'
  ];

  public employmentTypeDetail = [
    '非学生・夜間/通信制学生',
    '昼間部学生'
  ];

  public selectedEmploymentTypeMain: string = '';
  public selectedEmploymentTypeDetail: string = '';

  public selectedCSVFile: File | null = null;
  public importResult: string = '';
  public formErrorMessage: string = '';
  public officeNameList: string[] = [];

  constructor(
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    // 従業員一覧の取得
    const q = query(collection(db, 'employees'), orderBy('employee_no', 'asc'));
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
      // officesFormが配列で、各要素にofficeNameが存在する場合すべて抽出
      this.officeNameList = officesForm
        .map((o: any) => o.officeName)
        .filter((name: string | undefined) => typeof name === 'string' && name.trim() !== '');
    } else {
      this.officeNameList = [];
    }
  }

  downloadFormatCSV() {
    const headers = [
      '社員番号','姓','名','姓カナ','名カナ','生年月日','性別','国籍','扶養者の有無','障がいの有無','海外勤務の有無',
      '海外勤務時の雇用形態','社会保障協定国であるか','赴任開始日','赴任終了日（予定日）',
      '在籍状況','入社年月日','退社年月日',
      '所属事業所','雇用形態','雇用見込み','所定労働時間','見込み月収',
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
      '所属事業所','雇用形態','雇用見込み','所定労働時間','見込み月収',
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
      has_overseas: '海外勤務の有無', status: '在籍状況', hire_date: '入社年月日', office: '所属事業所', employment_type: '雇用形態',
      employment_expectation: '雇用見込み', scheduled_working_hours: '所定労働時間', expected_monthly_income: '見込み月収',
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
      'employment_expectation','scheduled_working_hours','expected_monthly_income','address','phone_number'
    ];
    requiredFields.forEach(field => {
      if (!employee[field]) errors.push(`${this.fieldNameToLabel(field)}がありません`);
    });
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
    if (employee.has_overseas === 'あり') {
      if (!employee.overseas_employment_type) errors.push('海外勤務時の雇用形態がありません');
      if (!employee.overseas_assignment_start) errors.push('赴任開始日がありません');
      if (employee.overseas_employment_type === '日本法人雇用') {
        if (!employee.is_social_security_agreement) errors.push('社会保障協定国であるかがありません');
      }
    }
    if (employee.status === '退職') {
      if (!employee.retirement_date) errors.push('退社年月日がありません');
    }
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
    const text = await this.selectedCSVFile.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      this.importResult = 'CSVにデータがありません。';
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
  }

  onRegisterOrUpdate() {
    // 各フォーム値を1つの従業員オブジェクトにまとめる
    const employee = {
      ...this.basicForm,
      ...this.employmentForm,
      ...this.workForm,
      ...this.contactForm,
      ...this.insuranceForm,
      // full_name, full_name_kanaを明示的に追加
      full_name: (this.basicForm.last_name || '') + ' ' + (this.basicForm.first_name || ''),
      full_name_kana: (this.basicForm.last_name_kana || '') + ' ' + (this.basicForm.first_name_kana || '')
    };
    // 雇用形態2段階選択の連結
    if (this.selectedEmploymentTypeMain) {
      employee.employment_type = this.selectedEmploymentTypeMain;
      if (this.selectedEmploymentTypeMain === 'パート・アルバイト' || this.selectedEmploymentTypeMain === '有給インターン') {
        employee.employment_type += `（${this.selectedEmploymentTypeDetail}）`;
      }
    }
    // バリデーション
    const errors = this.validateEmployee(employee);
    if (errors.length > 0) {
      this.formErrorMessage = errors.join('、');
      return;
    }
    this.formErrorMessage = '';
    // Firestore登録処理
    setDoc(doc(db, 'employees', employee.employee_no), employee)
      .then(() => {
        this.formErrorMessage = '登録が完了しました。';
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
}
