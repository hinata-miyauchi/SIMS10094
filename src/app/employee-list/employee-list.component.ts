import { Component, OnInit } from '@angular/core';
import { collection, getDocs, getFirestore, query, orderBy, doc, setDoc, where, onSnapshot } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { EmployeeEditModalComponent } from './employee-edit-modal.component';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { calculateSocialInsuranceStatus } from '../social-insurance-status/social-insurance-status.component';
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
    overseas_assignment_end: '',
    assignment_period: ''
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
    employment_type_detail: '',
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
    health_insurance_acquisition_date: '',
    health_insurance_loss_date: '',
    pension_insurance_no: '',
    basic_pension_no: '',
    pension_acquisition_date: '',
    pension_loss_date: '',
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
  public registerMessage: string = '';
  public pagedEmployees: any[] = [];
  public currentPage: number = 1;
  public pageSize: number = 25;
  public totalPages: number = 1;
  public employeeDefault = {
    healthInsurance: false,
    nursingCareInsurance: false,
    pension: false,
    remarks: '',
    manualInsuranceEdit: false
  };
  public today: string = '';

  constructor(
    private router: Router,
    private auth: Auth
  ) {}

  async ngOnInit(): Promise<void> {
    // 本日の日付をYYYY-MM-DD形式でセット
    const now = new Date();
    this.today = now.toISOString().slice(0, 10);
    // uidの取得をonAuthStateChangedで確実に
    onAuthStateChanged(this.auth, async (user) => {
      if (!user) return;
      const uid = user.uid;
      const q = query(collection(db, 'employees'), where('uid', '==', uid));
      this.loading = true;
      // Firestoreのリアルタイムリスナーで自動更新
      onSnapshot(q, (querySnapshot) => {
        this.employeeList = querySnapshot.docs
          .map(doc => doc.data())
          .sort((a, b) => Number(a['employee_no']) - Number(b['employee_no']));
        this.loading = false;
        this.currentPage = 1;
        this.updatePagedEmployees();
      });
      // 会社情報（事業所名リスト）は従来通り一度だけ取得
      (async () => {
        // uidでcompanyコレクションを絞り込み
        const companySnap = await getDocs(collection(db, 'company'));
        const userCompanyDoc = companySnap.docs.find(doc => doc.id === uid);
        if (userCompanyDoc) {
          const companyData = userCompanyDoc.data();
          const officesForm = companyData['officesForm'] || [];
          this.officeNameList = officesForm
            .map((o: any) => o.officeName)
            .filter((name: string | undefined) => typeof name === 'string' && name.trim() !== '');
        } else {
          this.officeNameList = [];
        }
      })();
    });
  }

  updatePagedEmployees() {
    this.totalPages = Math.max(1, Math.ceil(this.employeeList.length / this.pageSize));
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedEmployees = this.employeeList.slice(start, end);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagedEmployees();
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  prevPage() {
    this.goToPage(this.currentPage - 1);
  }

  downloadFormatCSV() {
    const header = 'employee_no,last_name,first_name,last_name_kana,first_name_kana,birth_date,gender,my_number,nationality,has_dependents,has_disability,has_overseas,overseas_employment_type,is_social_security_agreement,assignment_period,overseas_assignment_start,overseas_assignment_end,status,hire_date,retirement_date,leave_start,leave_end,leave_reason,office,employment_type,employment_type_detail,employment_expectation,scheduled_working_hours,scheduled_working_days,expected_monthly_income,address,phone_number,health_insurance_no,health_insurance_acquisition_date,health_insurance_loss_date,basic_pension_no,pension_acquisition_date,pension_loss_date';
    this.downloadCSV(header + '\n', 'employee_format.csv');
  }

  downloadSampleCSV() {
    const sample = `社員番号,姓,名,姓カナ,名カナ,生年月日【yyyy-mm-dd】,性別【男・女・その他】,マイナンバー【12桁の数字】,国籍【日本・日本以外】,扶養者の有無【あり・なし・扶養者本人】,障がいの有無【あり・なし】,海外勤務の有無【あり・なし】,海外勤務時の雇用形態【（海外勤務'あり'の場合は必須）日本法人雇用・現地法人雇用】,社会保障協定国であるか【（海外勤務時の雇用形態が'日本法人雇用'の場合は必須）はい・いいえ】,赴任予定期間【（社会保障協定国であるかが'はい'の場合は必須）5年以内・5年超】,赴任開始日【（海外勤務'あり'の場合は必須項目）yyyy-mm-dd】,赴任終了日（予定日）【（海外勤務'あり'の場合は任意項目）yyyy-mm-dd】,在籍状況【在籍・退職・休職】,入社年月日【yyyy-mm-dd】,退社年月日【（在籍状況が'退職'の場合は必須項目）yyyy-mm-dd】,休職開始日【（在籍状況が'休職'の場合は必須項目）yyyy-mm-dd】,休職終了日【（在籍状況が'休職'の場合は必須項目）yyyy-mm-dd】,休職理由【（在籍状況が'休職'の場合は必須項目）産前産後休業・育児休業・その他休業（病気・介護など）】,所属事業所【会社情報で登録している事業所を記入】,雇用形態【正社員・契約社員・嘱託社員・（パート・アルバイト）・有給インターン・個人事業主】,区分【（雇用形態が'パート・アルバイト'もしくは'有給インターン'の場合）（非学生・休学/夜間/通信制学生）・昼間部学生】,雇用見込み【2か月超・2か月以内】,週の所定労働時間【（一週間当たりの勤務時間（h））】,月の所定労働日数【（1か月あたりの勤務日数（日））】,見込み固定的賃金【（基本給や通勤手当（毎月一定額支給の場合）や住宅手当や役職手当などの基本毎月変動しない手当の合計）】,現住所,電話番号,健康保険被保険者番号,健康保険資格取得日【yyyy-mm-dd】,健康保険資格喪失日【yyyy-mm-dd】,基礎年金番号（厚生年金）,厚生年金資格取得日【yyyy-mm-dd】,厚生年金資格喪失日【yyyy-mm-dd】\n必須項目,必須項目,必須項目,必須項目,必須項目,必須項目,必須項目,必須項目,必須項目,必須項目,必須項目,必須項目,条件付き必須項目,条件付き必須項目,条件付き必須項目,条件付き必須項目,任意項目,必須項目,必須項目,条件付き必須項目,条件付き必須項目,条件付き必須項目,条件付き必須項目,必須項目,必須項目,条件付き必須項目,必須項目,必須項目,必須項目,必須項目,必須項目,必須項目,取得済みならば入力推奨,取得済みならば入力推奨,任意項目,取得済みならば入力推奨,取得済みならば入力推奨,任意項目\nemployee_no,last_name,first_name,last_name_kana,first_name_kana,birth_date,gender,my_number,nationality,has_dependents,has_disability,has_overseas,overseas_employment_type,is_social_security_agreement,assignment_period,overseas_assignment_start,overseas_assignment_end,status,hire_date,retirement_date,leave_start,leave_end,leave_reason,office,employment_type,employment_type_detail,employment_expectation,scheduled_working_hours,scheduled_working_days,expected_monthly_income,address,phone_number,health_insurance_no,health_insurance_acquisition_date,health_insurance_loss_date,basic_pension_no,pension_acquisition_date,pension_loss_date\n1032,佐藤,正人,サトウ,マサト,1940-03-31,男,111122223333,日本,あり,なし,あり,日本法人雇用,はい,5年以内,2020-03-12,2021-10-10,休職,2019-04-01,,2021-04-01,2021-05-01,育児休業,東京本社,パート・アルバイト,非学生・休学/夜間/通信制学生,2か月超,30,20,100000,東京,09088882222,101,2019-04-01,2025-04-01,102,2019-04-01,2025-04-01\n1031,田中,佑都,タナカ,ユウト,1940-04-01,男,222299998888,日本以外,なし,なし,なし,,,,,,在職,2019-04-01,2020-04-01,,,,大阪支社,正社員,,2か月超,40,20,100000,大阪,08011112222,,,,,,`;
    this.downloadCSV(sample, 'employee_sample.csv');
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
      address: '現住所', phone_number: '電話番号', overseas_employment_type: '海外勤務時の雇用形態', is_social_security_agreement: '社会保障協定国であるか', overseas_assignment_start: '赴任開始日', overseas_assignment_end: '赴任終了日（予定日）', retirement_date: '退社年月日',
      leave_start: '休職開始日', leave_end: '休職終了日', leave_reason: '休職理由',
      health_insurance_acquisition_date: '健康保険資格取得日', health_insurance_loss_date: '健康保険資格喪失日',
      pension_acquisition_date: '厚生年金資格取得日', pension_loss_date: '厚生年金資格喪失日',
      qualification_acquisition_date: '資格取得日', qualification_loss_date: '資格喪失日',
      // 日本語→英語対応
      '社員番号': 'employee_no', '姓': 'last_name', '名': 'first_name', '姓カナ': 'last_name_kana', '名カナ': 'first_name_kana',
      '生年月日': 'birth_date', '性別': 'gender', '国籍': 'nationality', '扶養者の有無': 'has_dependents', '障がいの有無': 'has_disability',
      '海外勤務の有無': 'has_overseas', '在籍状況': 'status', '入社年月日': 'hire_date', '所属事業所': 'office', '雇用形態': 'employment_type', '区分': 'employment_type_detail', 'マイナンバー': 'my_number',
      '雇用見込み': 'employment_expectation', '週の所定労働時間': 'scheduled_working_hours', '月の所定労働日数': 'scheduled_working_days', '見込み固定的賃金': 'expected_monthly_income',
      '現住所': 'address', '電話番号': 'phone_number', '海外勤務時の雇用形態': 'overseas_employment_type', '社会保障協定国であるか': 'is_social_security_agreement', '赴任開始日': 'overseas_assignment_start', '赴任終了日（予定日）': 'overseas_assignment_end', '退社年月日': 'retirement_date',
      '休職開始日': 'leave_start', '休職終了日': 'leave_end', '休職理由': 'leave_reason',
      '健康保険資格取得日': 'health_insurance_acquisition_date', '健康保険資格喪失日': 'health_insurance_loss_date',
      '厚生年金資格取得日': 'pension_acquisition_date', '厚生年金資格喪失日': 'pension_loss_date',
      '資格取得日': 'qualification_acquisition_date', '資格喪失日': 'qualification_loss_date'
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
      // false（boolean）は未入力扱いしない
      if (employee[field] === undefined || employee[field] === '' || employee[field] === null) {
        missingFields.push(this.fieldNameToLabel(field));
      }
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
    // 許可されたフィールド名リスト
    const allowedFields = [
      'employee_no','last_name','first_name','last_name_kana','first_name_kana','birth_date','gender','my_number','nationality','has_dependents','has_disability','has_overseas','overseas_employment_type','is_social_security_agreement','assignment_period','overseas_assignment_start','overseas_assignment_end','status','hire_date','retirement_date','leave_start','leave_end','leave_reason','office','employment_type','employment_type_detail','employment_expectation','scheduled_working_hours','scheduled_working_days','expected_monthly_income','address','phone_number','health_insurance_no','health_insurance_acquisition_date','health_insurance_loss_date','basic_pension_no','pension_acquisition_date','pension_loss_date'
    ];
    const invalidFields = headers.filter((h: string) => !allowedFields.includes(h.trim()));
    if (invalidFields.length > 0) {
      this.importResult = `許可されていないフィールドが含まれています: ${invalidFields.join(', ')}`;
      this.loading = false;
      return;
    }
    let success = 0, fail = 0;
    const errorsAll: string[] = [];
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      this.importResult = 'ログイン情報が取得できません。';
      this.loading = false;
      return;
    }
    // 既存従業員リストを一括取得
    const existingSnap = await getDocs(query(collection(db, 'employees'), where('uid', '==', uid)));
    const existingNos = new Set(existingSnap.docs.map(doc => doc.data()['employee_no']));
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length !== headers.length) { errorsAll.push(`行${i+1}: カラム数が一致しません`); fail++; continue; }
      // full_name, full_name_kanaを明示的に追加
      const employee: any = {
        full_name: '',
        full_name_kana: ''
      };
      headers.forEach((h, idx) => {
        // 英語フィールド名でセット
        employee[h] = values[idx];
        // 日本語ヘッダーの場合はfieldNameToLabelで英語名に変換してセット
        const mapped = this.fieldNameToLabel(h);
        if (mapped !== h) {
          employee[mapped] = values[idx];
        }
      });
      // 半角英数字正規化
      employee.my_number = this.normalizeToAlphanumeric(employee.my_number);
      employee.employee_no = this.normalizeToAlphanumeric(employee.employee_no);
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
      // has_disability, has_overseasはnormalizeValueを通さず、CSV値を直接判定
      employee.has_disability = (employee.has_disability === 'あり') ? 'true' : (employee.has_disability === 'なし') ? 'false' : '';
      employee.has_overseas = (employee.has_overseas === 'あり') ? 'true' : (employee.has_overseas === 'なし') ? 'false' : '';
      // uidを付与
      employee.uid = this.auth.currentUser?.uid || '';
      // 重複チェック
      if (existingNos.has(employee['employee_no'])) {
        errorsAll.push(`行${i+1}: 従業員番号${employee['employee_no']}は既に登録されています`);
        fail++;
        continue;
      }
      const errors = this.validateEmployee(employee);
      if (errors.length > 0) {
        errorsAll.push(`行${i+1}: ${errors.join('、')}`);
        fail++;
        continue;
      }
      try {
        // 会社情報取得
        const companySnap = await getDocs(query(collection(db, 'company'), where('uid', '==', uid)));
        const companyData = !companySnap.empty ? companySnap.docs[0].data() : {};
        // 社会保険自動判定
        if (!employee.manualInsuranceEdit) {
          const result = calculateSocialInsuranceStatus(employee, companyData);
          employee.healthInsurance = result.healthInsurance;
          employee.nursingCareInsurance = result.nursingCareInsurance;
          employee.pension = result.pension;
          employee.remarks = result.remarks;
        }
        // 英語フィールド名のみ抽出
        const englishFieldNames = [
          'employee_no','last_name','first_name','last_name_kana','first_name_kana','birth_date','gender','nationality',
          'has_dependents','has_disability','has_overseas','status','hire_date','office','employment_type',
          'employment_type_detail','employment_expectation','scheduled_working_hours','scheduled_working_days','expected_monthly_income','address','phone_number','my_number',
          'overseas_employment_type','is_social_security_agreement','assignment_period','overseas_assignment_start','overseas_assignment_end','retirement_date',
          'leave_start','leave_end','leave_reason','health_insurance_no','health_insurance_acquisition_date','health_insurance_loss_date',
          'pension_insurance_no','basic_pension_no','pension_acquisition_date','pension_loss_date','qualification_acquisition_date','qualification_loss_date',
          'full_name','full_name_kana'
        ];
        const employeeToSave: any = {};
        englishFieldNames.forEach(key => {
          if (employee[key] !== undefined) employeeToSave[key] = employee[key];
        });
        // uidも保存
        employeeToSave.uid = employee.uid;
        // has_disability, has_overseasの変換はここでは不要
        const docId = employee.uid + '_' + employee.employee_no;
        await setDoc(doc(db, 'employees', docId), employeeToSave);
        success++;
        // 保存成功時のみSetに追加
        existingNos.add(employee['employee_no']);
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
    // 雇用形態の選択値をworkFormに反映
    this.workForm.employment_type = this.selectedEmploymentTypeMain;
    this.workForm.employment_type_detail = this.selectedEmploymentTypeDetail;
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
      full_name_kana: (this.basicForm.last_name_kana || '') + ' ' + (this.basicForm.first_name_kana || ''),
      healthInsurance: false,
      nursingCareInsurance: false,
      pension: false,
      remarks: '',
      manualInsuranceEdit: false
    };
    // 会社情報取得
    const companySnap = await getDocs(query(collection(db, 'company'), where('uid', '==', uid)));
    const companyData = !companySnap.empty ? companySnap.docs[0].data() : {};
    // 社会保険自動判定
    if (!employee.manualInsuranceEdit) {
      const result = calculateSocialInsuranceStatus(employee, companyData);
      employee.healthInsurance = result.healthInsurance;
      employee.nursingCareInsurance = result.nursingCareInsurance;
      employee.pension = result.pension;
      employee.remarks = result.remarks;
    }
    // バリデーション
    if (!this.basicForm.my_number || this.basicForm.my_number.length < 12) {
      this.formErrorMessage = 'マイナンバーは12桁で入力してください。';
      return;
    }
    // 生年月日が未来日かどうかチェック
    if (this.basicForm.birth_date && this.basicForm.birth_date > this.today) {
      this.formErrorMessage = '生年月日は本日以前の日付を入力してください。';
      return;
    }
    // 標準報酬月額（見込み固定的賃金）が0または空の場合はエラー
    if (!this.workForm.expected_monthly_income || Number(this.workForm.expected_monthly_income) === 0) {
      this.formErrorMessage = '標準報酬月額（見込み固定的賃金）は0より大きい値を入力してください。';
      return;
    }
    // 週の所定労働時間が0または空の場合はエラー
    if (!this.workForm.scheduled_working_hours || Number(this.workForm.scheduled_working_hours) === 0) {
      this.formErrorMessage = '週の所定労働時間は0より大きい値を入力してください。';
      return;
    }
    // 月の所定労働日数が0または空の場合はエラー
    if (!this.workForm.scheduled_working_days || Number(this.workForm.scheduled_working_days) === 0) {
      this.formErrorMessage = '月の所定労働日数は0より大きい値を入力してください。';
      return;
    }
    const errors = this.validateEmployee(employee);
    if (errors.length > 0) {
      this.formErrorMessage = errors.join('、');
      return;
    }
    this.formErrorMessage = '';
    // Firestore登録前に重複チェック
    const existingSnap = await getDocs(query(collection(db, 'employees'), where('uid', '==', uid), where('employee_no', '==', employee.employee_no)));
    if (!existingSnap.empty) {
      this.formErrorMessage = 'この従業員番号は既に登録されています。';
      return;
    }
    // Firestore登録処理
    const employeeToSave: any = { ...employee };
    // has_disability, has_overseasの変換はここでは不要
    if (employeeToSave.scheduled_working_hours !== undefined) employeeToSave.scheduled_working_hours = Number(employeeToSave.scheduled_working_hours);
    if (employeeToSave.scheduled_working_days !== undefined) employeeToSave.scheduled_working_days = Number(employeeToSave.scheduled_working_days);
    if (employeeToSave.expected_monthly_income !== undefined) employeeToSave.expected_monthly_income = Number(employeeToSave.expected_monthly_income);
    const docId = employee.uid + '_' + employee.employee_no;
    await setDoc(doc(db, 'employees', docId), employeeToSave)
      .then(() => {
        this.formErrorMessage = '登録が完了しました。';
        this.setupAutoClearMessage();
        // フォーム内容を初期化
        this.basicForm = {
          last_name: '', first_name: '', last_name_kana: '', first_name_kana: '', birth_date: '', gender: '', my_number: '', nationality: '', has_dependents: '', has_disability: '', has_overseas: '', overseas_employment_type: '', is_social_security_agreement: '', overseas_assignment_start: '', overseas_assignment_end: '', assignment_period: ''
        };
        this.employmentForm = { status: '', hire_date: '', retirement_date: '', leave_start: '', leave_end: '', leave_reason: '' };
        this.workForm = { employee_no: '', office: '', employment_type: '', employment_type_detail: '', scheduled_working_hours: '', scheduled_working_days: '', expected_monthly_income: '', employment_expectation: '' };
        this.contactForm = { address: '', phone_number: '' };
        this.insuranceForm = { health_insurance_no: '', health_insurance_acquisition_date: '', health_insurance_loss_date: '', pension_insurance_no: '', basic_pension_no: '', pension_acquisition_date: '', pension_loss_date: '', qualification_acquisition_date: '', qualification_loss_date: '' };
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
      this.registerMessage = '';
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
    this.selectedEmployee = { ...this.employeeDefault };
    this.selectedEmployee = { ...emp };
    this.editModalOpen = true;
    // モーダルを開くときにエラーメッセージをクリア
    this.formErrorMessage = '';
  }

  onEmployeeUpdated() {
    // 従業員一覧を再取得するロジックをここに記述（ngOnInit等を呼び出し）
    this.ngOnInit();
    this.registerMessage = '保存しました。';
    this.setupAutoClearMessage();
  }

  setMainTabIndex(idx: number) {
    this.mainTabIndex = idx;
    if (idx === 1) {
      this.subTabIndex = 0;
    } else {
      // 従業員登録画面の入力内容をリセット
      this.basicForm = {
        last_name: '', first_name: '', last_name_kana: '', first_name_kana: '', birth_date: '', gender: '', my_number: '', nationality: '', has_dependents: '', has_disability: '', has_overseas: '', overseas_employment_type: '', is_social_security_agreement: '', overseas_assignment_start: '', overseas_assignment_end: '', assignment_period: ''
      };
      this.employmentForm = { status: '', hire_date: '', retirement_date: '', leave_start: '', leave_end: '', leave_reason: '' };
      this.workForm = { employee_no: '', office: '', employment_type: '', employment_type_detail: '', scheduled_working_hours: '', scheduled_working_days: '', expected_monthly_income: '', employment_expectation: '' };
      this.contactForm = { address: '', phone_number: '' };
      this.insuranceForm = { health_insurance_no: '', health_insurance_acquisition_date: '', health_insurance_loss_date: '', pension_insurance_no: '', basic_pension_no: '', pension_acquisition_date: '', pension_loss_date: '', qualification_acquisition_date: '', qualification_loss_date: '' };
      this.selectedEmploymentTypeMain = '';
      this.selectedEmploymentTypeDetail = '';
      this.subTabIndex = 0;
      this.formErrorMessage = '';
    }
  }

  // モーダルを閉じる処理（キャンセル・×ボタン用）
  closeEditModal() {
    this.editModalOpen = false;
    this.selectedEmployee = null;
    // モーダルを閉じたときにエラーメッセージもクリア
    this.formErrorMessage = '';
  }
}
