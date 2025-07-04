import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Firestore, doc, getDoc, setDoc, query, where, collection, getDocs } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { calculateSocialInsuranceStatus } from '../social-insurance-status/social-insurance-status.component';

@Component({
  selector: 'app-company-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './company-info.component.html',
  styleUrls: ['./company-info.component.scss']
})
export class CompanyInfoComponent implements OnInit {
  tabIndex = 0;
  tabLabels = [
    '基本情報',
    '事業所情報',
    '保険情報',
    '給与情報',
    '担当者情報'
  ];

  companyForm: FormGroup;
  loading = false;
  message = '';
  submitted = false;
  private clearMessageListener: (() => void) | null = null;

  constructor(private fb: FormBuilder, private firestore: Firestore, private auth: Auth) {
    this.companyForm = this.fb.group({
      // 基本情報
      basic: this.fb.group({
        name: ['', Validators.required],
        nameKana: [''],
        companyNo: ['', Validators.required],
        address: [''],
        addressKana: [''],
        president: [''],
        established: [''],
        business: [''],
        capital: [''],
        isSpecifiedOffice: ['', Validators.required],
        weeklyWorkingHours: ['', Validators.required],
        monthlyWorkingDays: ['', Validators.required]
      }),
      // 事業所情報
      officesForm: this.fb.array([
        this.createOfficeForm()
      ]),
      // 保険情報
      insurance: this.fb.group({
        healthType: ['', Validators.required]
      }),
      // 給与情報
      salary: this.fb.group({
        closingDay: [''],
        paymentDay: [''],
        paymentTiming: [''],
        bonusTimes: ['', Validators.required]
      }),
      // 担当者情報
      staff: this.fb.group({
        staffName: [''],
        staffContact: ['']
      })
    });
  }

  async ngOnInit() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    // Firestoreからuidが一致する会社情報を取得
    const q = query(collection(this.firestore, 'company'), where('uid', '==', uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      // officesFormの長さに合わせてFormArrayを調整
      const offices = data['officesForm'] || [];
      const officesFormArray = this.companyForm.get('officesForm') as FormArray;
      // 既存のFormArrayをクリア
      while (officesFormArray.length > 0) {
        officesFormArray.removeAt(0);
      }
      // Firestoreの配列分FormGroupを追加
      offices.forEach(() => officesFormArray.push(this.createOfficeForm()));
      // 値を反映
      this.companyForm.patchValue(data);
    }
  }

  get basicForm() {
    return this.companyForm.get('basic') as FormGroup;
  }
  get officesForm() {
    return this.companyForm.get('officesForm') as FormArray;
  }
  get officeFormGroups(): FormGroup[] {
    return this.officesForm.controls as FormGroup[];
  }
  get insuranceForm() {
    return this.companyForm.get('insurance') as FormGroup;
  }
  get salaryForm() {
    return this.companyForm.get('salary') as FormGroup;
  }
  get staffForm() {
    return this.companyForm.get('staff') as FormGroup;
  }

  createOfficeForm(): FormGroup {
    return this.fb.group({
      officeName: ['', Validators.required],
      officeAddress: [''],
      officeAddressKana: [''],
      applicableOfficeNo: ['', Validators.required],
      officeType: [''],
      prefecture: ['', Validators.required]
    });
  }

  addOffice() {
    this.officesForm.push(this.createOfficeForm());
  }

  removeOffice(idx: number) {
    if (this.officesForm.length > 1) {
      this.officesForm.removeAt(idx);
    }
  }

  setTab(idx: number) {
    this.tabIndex = idx;
    this.submitted = false;
  }

  private setupAutoClearMessage() {
    if (this.clearMessageListener) return;
    const clear = () => {
      this.message = '';
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

  private toHalfWidth(str: string): string {
    return (str || '').replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
  }

  async save() {
    this.submitted = true;
    if (this.companyForm.invalid) {
      const fields = this.invalidRequiredFields;
      this.message = fields.length > 0 ? fields.join('、') + 'が未入力です' : '必須項目が未入力です';
      return;
    }
    this.loading = true;
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      this.message = 'ログイン情報が取得できません。再度ログインしてください。';
      this.loading = false;
      return;
    }
    // 全角数字→半角数字変換
    const formValue = { ...this.companyForm.value };
    formValue.basic = { ...formValue.basic, companyNo: this.toHalfWidth(formValue.basic.companyNo) };
    formValue.staff = { ...formValue.staff, staffContact: this.toHalfWidth(formValue.staff.staffContact) };
    formValue.officesForm = formValue.officesForm.map((office: any) => ({
      ...office,
      applicableOfficeNo: this.toHalfWidth(office.applicableOfficeNo)
    }));
    const ref = doc(this.firestore, 'company', uid);
    const data = { ...formValue, uid };
    await setDoc(ref, data, { merge: true });
    // 会社情報保存後、全従業員の社会保険自動判定を一括更新
    const employeesSnap = await getDocs(query(collection(this.firestore, 'employees'), where('uid', '==', uid)));
    for (const docSnap of employeesSnap.docs) {
      const emp = docSnap.data();
      if (!emp['manualInsuranceEdit']) {
        const result = calculateSocialInsuranceStatus(emp, data);
        const updateObj: any = {
          autoHealthInsurance: result.healthInsurance,
          autoNursingCareInsurance: result.nursingCareInsurance,
          autoPension: result.pension,
          healthInsurance: result.healthInsurance,
          nursingCareInsurance: result.nursingCareInsurance,
          pension: result.pension,
          remarks: result.remarks
        };
        await setDoc(doc(this.firestore, 'employees', docSnap.id), updateObj, { merge: true });
      }
    }
    this.message = '保存しました。';
    this.setupAutoClearMessage();
    this.loading = false;
    this.submitted = false;
  }

  get invalidRequiredFields(): string[] {
    const fields: string[] = [];
    // 基本情報
    if (this.basicForm.get('name')?.invalid) fields.push('会社名');
    if (this.basicForm.get('companyNo')?.invalid) fields.push('法人番号');
    if (this.basicForm.get('isSpecifiedOffice')?.invalid) fields.push('特定適用事業所であるか');
    if (this.basicForm.get('weeklyWorkingHours')?.invalid) fields.push('週の所定労働時間');
    if (this.basicForm.get('monthlyWorkingDays')?.invalid) fields.push('月の所定労働日数');
    // 事業所情報（最初の事業所のみチェック）
    const office = this.officesForm.at(0);
    if (office) {
      if (office.get('officeName')?.invalid) fields.push('事業所名称');
      if (office.get('applicableOfficeNo')?.invalid) fields.push('適用事業所番号');
      if (office.get('prefecture')?.invalid) fields.push('都道府県');
    }
    // 保険情報
    if (this.insuranceForm.get('healthType')?.invalid) fields.push('健康保険種別');
    // 給与情報
    if (this.salaryForm.get('bonusTimes')?.invalid) fields.push('賞与回数');
    // paymentTimingは必須項目から除外
    return fields;
  }
}