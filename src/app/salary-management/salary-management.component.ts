import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, getDocs, addDoc, doc, setDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { query, where } from '@angular/fire/firestore';

interface Employee {
  id: string;
  name: string;
  employee_no: string;
}

@Component({
  selector: 'app-salary-management',
  standalone: true,
  imports: [RouterLink, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './salary-management.component.html',
  styleUrls: ['./salary-management.component.scss']
})
export class SalaryManagementComponent implements OnInit, OnDestroy {
  tabIndex = 0;
  employees: Employee[] = [];
  salaryForm: FormGroup;
  // 給与一覧用
  salaryList: any[] = [];
  searchEmployeeId: string = '';
  searchSalaryMonth: string = '';
  searchEmployeeNo: string = '';
  searchSalaryYear: string = '';
  // 検索実行時に使う値
  appliedSearchEmployeeNo: string = '';
  appliedSearchSalaryYear: string = '';
  appliedSearchSalaryMonth: string = '';
  employeeError: string = '';
  selectedCsvFile: File | null = null;
  importMessage: string = '';
  yearList: number[] = [];
  loading: boolean = false;
  bonusTimes: string = '';
  registerMessage: string = '';
  private clearMessageListener: (() => void) | null = null;
  pagedSalaryList: any[] = [];
  currentSalaryPage: number = 1;
  salaryPageSize: number = 25;
  salaryTotalPages: number = 1;

  get filteredEmployees() {
    if (!this.searchEmployeeNo) return this.employees;
    return this.employees.filter(e => e.employee_no === this.searchEmployeeNo);
  }

  get filteredSalaryList(): any[] {
    return this.salaryList.filter(item => {
      const matchNo = !this.appliedSearchEmployeeNo || item.employeeNo.includes(this.appliedSearchEmployeeNo);
      const matchYear = !this.appliedSearchSalaryYear || item.salaryMonth.startsWith(this.appliedSearchSalaryYear + '-');
      const matchMonth = !this.appliedSearchSalaryMonth || item.salaryMonth.endsWith('-' + this.appliedSearchSalaryMonth);
      return matchNo && matchYear && matchMonth;
    });
  }

  constructor(private fb: FormBuilder, private firestore: Firestore, private auth: Auth) {
    this.salaryForm = this.fb.group({
      employeeNo: ['', Validators.required],
      fullName: [''],
      expectedFixedSalary: [''],
      salaryMonth: ['', Validators.required],
      workDays: ['', Validators.required],
      workHours: ['', Validators.required],
      fixedSalary: ['', Validators.required],
      variableSalary: ['', Validators.required],
      hasBonus: ['', Validators.required],
      bonus: ['']
    });
  }

  async ngOnInit() {
    this.loading = true;
    // 会社情報から賞与回数を取得
    const uid = this.auth.currentUser?.uid;
    if (!uid) { this.loading = false; return; }
    const companySnap = await getDocs(query(collection(this.firestore, 'company'), where('uid', '==', uid)));
    if (!companySnap.empty) {
      const companyData = companySnap.docs[0].data();
      this.bonusTimes = companyData['salary']?.bonusTimes || '';
    }
    // 現在の年月を取得し、デフォルトの検索条件にセット
    const now = new Date();
    this.yearList = [];
    for(let y = 2021; y <= now.getFullYear(); y++) {
      this.yearList.push(y);
    }
    this.searchSalaryYear = String(now.getFullYear());
    this.searchSalaryMonth = ('0' + (now.getMonth() + 1)).slice(-2);
    // 検索条件の初期値を反映
    this.appliedSearchEmployeeNo = this.searchEmployeeNo;
    this.appliedSearchSalaryYear = this.searchSalaryYear;
    this.appliedSearchSalaryMonth = this.searchSalaryMonth;
    // Firestoreから従業員リストを取得
    const empQuery = query(collection(this.firestore, 'employees'), where('uid', '==', uid));
    const snap = await getDocs(empQuery);
    this.employees = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data['full_name'] ?? '',
        employee_no: data['employee_no'] ?? ''
      };
    });

    this.salaryForm.get('employeeNo')?.valueChanges.subscribe(empNo => {
      const emp = this.employees.find(e => e.employee_no === empNo);
      this.salaryForm.get('fullName')?.setValue(emp ? emp.name : '');
      // 見込み固定給も自動セット
      if (emp) {
        // Firestoreから従業員詳細をuidで絞り込んで取得
        const uid = this.auth.currentUser?.uid;
        if (uid) {
          const empQuery = query(collection(this.firestore, 'employees'), where('uid', '==', uid), where('employee_no', '==', empNo));
          getDocs(empQuery).then(snap => {
            const empDoc = snap.docs[0];
            this.salaryForm.get('expectedFixedSalary')?.setValue(empDoc ? empDoc.data()['expected_monthly_income'] || '' : '');
          });
        } else {
          this.salaryForm.get('expectedFixedSalary')?.setValue('');
        }
      } else {
        this.salaryForm.get('expectedFixedSalary')?.setValue('');
      }
      // 入力が空欄、または4桁未満ならエラー非表示
      if (!empNo) {
        this.employeeError = '';
      } else if (empNo.length === 4) {
        this.employeeError = emp ? '' : '該当する従業員が登録されていないため従業員登録を行ってください';
      } else {
        this.employeeError = '';
      }
    });

    // Firestoreからuidが一致する給与データを取得
    const q = query(collection(this.firestore, 'salaries'), where('uid', '==', uid));
    const salarySnap = await getDocs(q);
    this.salaryList = salarySnap.docs.map(doc => {
      const data = doc.data();
      return {
        employeeNo: data['employee_no'] ?? '',
        employeeName: data['full_name'] ?? '',
        salaryMonth: data['salary_date'] ?? '',
        workDays: data['work_days'] ?? '',
        workHours: data['work_hours'] ?? '',
        salary: data['salary'] ?? '',
        hasBonus: data['has_bonus'] ?? '',
        bonus: data['bonus'] ?? '',
        fixedSalary: data['fixed_salary'] ?? '',
        expectedFixedSalary: data['expected_fixed_salary'] ?? ''
      };
    });
    // 従業員番号の昇順でソート
    this.salaryList = this.salaryList.sort((a, b) => {
      const aNo = Number(a.employeeNo);
      const bNo = Number(b.employeeNo);
      if (!isNaN(aNo) && !isNaN(bNo)) return aNo - bNo;
      return String(a.employeeNo).localeCompare(String(b.employeeNo), 'ja');
    });
    this.loading = false;
    this.currentSalaryPage = 1;
    this.updatePagedSalaryList();
  }

  async onSubmit() {
    // 必須項目の未入力チェック
    const requiredFields = [
      { key: 'employeeNo', label: '従業員番号' },
      { key: 'salaryMonth', label: '給与年月' },
      { key: 'workDays', label: '勤務日数' },
      { key: 'workHours', label: '勤務時間' },
      { key: 'fixedSalary', label: '固定的賃金' },
      { key: 'variableSalary', label: '変動的賃金' },
      { key: 'hasBonus', label: '賞与有無' }
    ];
    const formValue = this.salaryForm.value;
    const missingFields = requiredFields.filter(f => !formValue[f.key] && formValue[f.key] !== 0).map(f => f.label);
    // 賞与有無が「あり」の場合は賞与額も必須
    if (formValue.hasBonus === 'true' && (!formValue.bonus && formValue.bonus !== 0)) {
      missingFields.push('賞与額');
    }
    if (missingFields.length > 0) {
      this.employeeError = missingFields.join('、') + 'が未入力です';
      return;
    }
    this.employeeError = '';
    if (this.salaryForm.valid) {
      const uid = this.auth.currentUser?.uid;
      if (!uid) return;
      const data = {
        employee_no: formValue.employeeNo,
        full_name: formValue.fullName,
        expected_fixed_salary: formValue.expectedFixedSalary,
        salary_date: formValue.salaryMonth,
        work_days: formValue.workDays,
        work_hours: formValue.workHours,
        fixed_salary: formValue.fixedSalary,
        variable_salary: formValue.variableSalary,
        salary: (Number(formValue.fixedSalary) || 0) + (Number(formValue.variableSalary) || 0),
        has_bonus: formValue.hasBonus,
        bonus: formValue.bonus,
        uid
      };
      const docId = `${uid}_${formValue.employeeNo}_${formValue.salaryMonth}`;
      try {
        await setDoc(doc(collection(this.firestore, 'salaries'), docId), data);
        this.salaryForm.reset();
        this.registerMessage = '登録しました。';
        this.setupAutoClearMessage();
      } catch (e) {
        console.error('Firestore登録エラー:', e);
      }
    }
  }

  private setupAutoClearMessage() {
    if (this.clearMessageListener) return;
    const clear = () => {
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

  onCsvFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedCsvFile = input.files[0];
      this.importMessage = `${this.selectedCsvFile.name} を選択しました。`;
    } else {
      this.selectedCsvFile = null;
      this.importMessage = '';
    }
  }

  async importSalaryCsv() {
    if (!this.selectedCsvFile) {
      this.importMessage = 'CSVファイルが選択されていません。';
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      const text = e.target.result;
      const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
      if (lines.length < 2) {
        this.importMessage = 'データ行がありません。';
        return;
      }
      const headers = lines[0].split(',');
      // 許可されたフィールド名リスト
      const allowedFields = ['employee_no','salary_date','work_days','work_hours','fixed_salary','variable_salary','has_bonus','bonus'];
      const invalidFields = headers.filter((h: string) => !allowedFields.includes(h.trim()));
      if (invalidFields.length > 0) {
        this.importMessage = `許可されていないフィールドが含まれています: ${invalidFields.join(', ')}`;
        return;
      }
      let successCount = 0;
      let errorCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length !== headers.length) {
          errorCount++;
          continue;
        }
        const row: any = {};
        headers.forEach((h: string, idx: number) => row[h.trim()] = values[idx].trim());
        // has_bonusの変換処理を修正
        if (row.has_bonus === '有' || row.has_bonus === 'あり' || row.has_bonus === 'true' || row.has_bonus === 'TRUE') {
          row.has_bonus = true;
        } else if (row.has_bonus === '無' || row.has_bonus === 'なし') {
          row.has_bonus = false;
        } else {
          row.has_bonus = '';
        }
        // 数値型に変換
        row.fixed_salary = row.fixed_salary !== undefined && row.fixed_salary !== '' ? Number(row.fixed_salary) : 0;
        row.variable_salary = row.variable_salary !== undefined && row.variable_salary !== '' ? Number(row.variable_salary) : 0;
        row.work_days = row.work_days !== undefined && row.work_days !== '' ? Number(row.work_days) : 0;
        row.work_hours = row.work_hours !== undefined && row.work_hours !== '' ? Number(row.work_hours) : 0;
        row.bonus = row.bonus !== undefined && row.bonus !== '' ? Number(row.bonus) : 0;
        // salary（合計）を自動計算
        row.salary = row.fixed_salary + row.variable_salary;
        // 従業員マスタから氏名・見込み固定給を自動補完
        try {
          const empSnap = await getDocs(query(collection(this.firestore, 'employees'), where('employee_no', '==', row.employee_no)));
          if (!empSnap.empty) {
            const empData = empSnap.docs[0].data();
            row.full_name = empData['full_name'] || row.full_name || '';
            row.expected_fixed_salary = empData['expected_monthly_income'] || '';
          } else {
            row.expected_fixed_salary = '';
          }
        } catch (e) {
          row.expected_fixed_salary = '';
        }
        // uidを自動付与
        row.uid = this.auth.currentUser?.uid || '';
        const docId = `${row.uid}_${row.employee_no}_${row.salary_date}`;
        try {
          await setDoc(doc(collection(this.firestore, 'salaries'), docId), row);
          successCount++;
        } catch (e) {
          errorCount++;
        }
      }
      this.importMessage = `インポート完了: ${successCount}件成功、${errorCount}件失敗`;
      this.selectedCsvFile = null;
    };
    reader.readAsText(this.selectedCsvFile);
  }

  downloadSalarySampleCsv() {
    const sample = `従業員番号,給与対象年月【yyyy-mm】,勤務日数,勤務時間,固定的賃金,変動的賃金,賞与有無【あり・なし】,賞与額【（賞与有無がありの場合は必須項目）金額】\n必須項目,必須項目,必須項目,必須項目,必須項目,必須項目,必須項目,条件付き必須項目\nemployee_no,salary_date,work_days,work_hours,fixed_salary,variable_salary,has_bonus,bonus\n1001,2025-07,20,160,250000,10000,なし,\n1002,2025-07,20,160,240000,10000,あり,10000`;
    this.downloadCSV(sample, 'salary_sample.csv');
  }

  downloadSalaryFormatCsv() {
    const header = 'employee_no,salary_date,work_days,work_hours,fixed_salary,variable_salary,has_bonus,bonus';
    const blob = new Blob([header + '\n'], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'salary_format.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async setTab(index: number) {
    this.tabIndex = index;
    if (index !== 1) {
      this.salaryForm.reset();
      this.registerMessage = '';
      this.employeeError = '';
    }
    this.importMessage = '';
    if (index === 0) {
      await this.fetchSalaryList();
    }
  }

  ngOnDestroy() {
    this.importMessage = '';
  }

  onYearInput(event: any) {
    const onlyNum = event.target.value.replace(/[^0-9]/g, '');
    this.searchSalaryYear = onlyNum;
    event.target.value = onlyNum;
  }

  async fetchSalaryList() {
    this.loading = true;
    const uid = this.auth.currentUser?.uid;
    if (!uid) { this.loading = false; return; }
    const q = query(collection(this.firestore, 'salaries'), where('uid', '==', uid));
    const salarySnap = await getDocs(q);
    this.salaryList = salarySnap.docs.map(doc => {
      const data = doc.data();
      return {
        employeeNo: data['employee_no'] ?? '',
        employeeName: data['full_name'] ?? '',
        salaryMonth: data['salary_date'] ?? '',
        workDays: data['work_days'] ?? '',
        workHours: data['work_hours'] ?? '',
        salary: data['salary'] ?? '',
        hasBonus: data['has_bonus'] ?? '',
        bonus: data['bonus'] ?? '',
        fixedSalary: data['fixed_salary'] ?? '',
        expectedFixedSalary: data['expected_fixed_salary'] ?? ''
      };
    });
    // 従業員番号の昇順でソート
    this.salaryList = this.salaryList.sort((a, b) => {
      const aNo = Number(a.employeeNo);
      const bNo = Number(b.employeeNo);
      if (!isNaN(aNo) && !isNaN(bNo)) return aNo - bNo;
      return String(a.employeeNo).localeCompare(String(b.employeeNo), 'ja');
    });
    this.loading = false;
    this.currentSalaryPage = 1;
    this.updatePagedSalaryList();
  }

  onSearch() {
    this.appliedSearchEmployeeNo = this.searchEmployeeNo;
    this.appliedSearchSalaryYear = this.searchSalaryYear;
    this.appliedSearchSalaryMonth = this.searchSalaryMonth;
    this.currentSalaryPage = 1;
    this.updatePagedSalaryList();
  }

  onClearSearch() {
    this.searchEmployeeNo = '';
    this.searchSalaryYear = '';
    this.searchSalaryMonth = '';
    this.appliedSearchEmployeeNo = '';
    this.appliedSearchSalaryYear = '';
    this.appliedSearchSalaryMonth = '';
    this.currentSalaryPage = 1;
    this.updatePagedSalaryList();
  }

  updatePagedSalaryList() {
    const filtered = this.filteredSalaryList;
    this.salaryTotalPages = Math.max(1, Math.ceil(filtered.length / this.salaryPageSize));
    const start = (this.currentSalaryPage - 1) * this.salaryPageSize;
    const end = start + this.salaryPageSize;
    this.pagedSalaryList = filtered.slice(start, end);
  }

  goToSalaryPage(page: number) {
    if (page < 1 || page > this.salaryTotalPages) return;
    this.currentSalaryPage = page;
    this.updatePagedSalaryList();
  }

  nextSalaryPage() {
    this.goToSalaryPage(this.currentSalaryPage + 1);
  }

  prevSalaryPage() {
    this.goToSalaryPage(this.currentSalaryPage - 1);
  }

  private downloadCSV(data: string, filename: string) {
    const blob = new Blob([data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
} 