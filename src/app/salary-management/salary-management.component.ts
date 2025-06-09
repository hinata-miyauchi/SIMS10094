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
  employeeError: string = '';
  selectedCsvFile: File | null = null;
  importMessage: string = '';
  yearList: number[] = [];

  get filteredEmployees() {
    if (!this.searchEmployeeNo) return this.employees;
    return this.employees.filter(e => e.employee_no === this.searchEmployeeNo);
  }

  get filteredSalaryList(): any[] {
    return this.salaryList.filter(item => {
      const matchNo = !this.searchEmployeeNo || item.employeeNo.includes(this.searchEmployeeNo);
      const matchYear = !this.searchSalaryYear || item.salaryMonth.startsWith(this.searchSalaryYear + '-');
      const matchMonth = !this.searchSalaryMonth || item.salaryMonth.endsWith('-' + this.searchSalaryMonth);
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
    // 現在の年月を取得し、デフォルトの検索条件にセット
    const now = new Date();
    this.yearList = [];
    for(let y = 2021; y <= now.getFullYear(); y++) {
      this.yearList.push(y);
    }
    this.searchSalaryYear = String(now.getFullYear());
    this.searchSalaryMonth = ('0' + (now.getMonth() + 1)).slice(-2);
    // Firestoreから従業員リストを取得
    const snap = await getDocs(collection(this.firestore, 'employees'));
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
        // Firestoreから従業員詳細を取得してexpected_monthly_incomeをセット
        getDocs(collection(this.firestore, 'employees')).then(snap => {
          const empDoc = snap.docs.find(d => d.data()['employee_no'] === empNo);
          this.salaryForm.get('expectedFixedSalary')?.setValue(empDoc ? empDoc.data()['expected_monthly_income'] || '' : '');
        });
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
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
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
      const docId = `${formValue.employeeNo}_${formValue.salaryMonth}`;
      try {
        await setDoc(doc(collection(this.firestore, 'salaries'), docId), data);
        this.salaryForm.reset();
        console.log('Firestoreに登録しました');
      } catch (e) {
        console.error('Firestore登録エラー:', e);
      }
    }
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
        // has_bonusの変換処理を追加
        if (row.has_bonus === '有') {
          row.has_bonus = true;
        } else if (row.has_bonus === '無') {
          row.has_bonus = false;
        }
        const docId = `${row.employee_no}_${row.salary_date}`;
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
    const sample = `employee_no,full_name,salary_date,work_days,work_hours,salary,has_bonus,bonus\n社員番号,社員名,給与年月,勤務日数,勤務時間,給与,賞与の有無,賞与額\n1007,冨安 健洋,2025-05,20,130,430000,無,\n1008,吉田 麻也,2025-05,20,130,350000,無,\n1004,ジェラード,2025-05,20,135,460000,無,\n1004,ジェラード,2025-04,18,120,400000,有,300000\n1006,クリスティアーノ・ロナウド,2025-05,20,130,520000,無,\n1005,デビッド・ベッカム,2025-05,20,130,550000,無,\n1013,長友 佑都,2025-05,15,90,250000,有,300000\n1010,ネイマール,2025-05,22,150,270000,有,300000\n1006,堂安 律,2025-05,22,155,180000,有,300000\n1001,久保 建英,2025-05,25,180,220000,無,\n1008,セルヒオ・ラモス,2025-05,24,175,650000,無,\n1009,遠藤 航,2025-05,20,120,370000,無,`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'salary_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  downloadSalaryFormatCsv() {
    const format = 'employee_no,full_name,salary_date,work_days,work_hours,salary,has_bonus,bonus\n';
    const blob = new Blob([format], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'salary_format.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async setTab(index: number) {
    this.tabIndex = index;
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
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
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
  }

  onSearch() {
    // 検索条件でフィルタリングをトリガー（getterなので再描画のみ）
    // 何もしなくてもgetterで自動反映されるが、明示的に呼ぶ場合用
  }

  onClearSearch() {
    this.searchEmployeeNo = '';
    this.searchSalaryYear = '';
    this.searchSalaryMonth = '';
    this.onSearch();
  }
} 