import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';

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

  constructor(private fb: FormBuilder, private firestore: Firestore) {
    this.companyForm = this.fb.group({
      // 基本情報
      basic: this.fb.group({
        name: ['', Validators.required],
        nameKana: [''],
        companyNo: [''],
        address: [''],
        addressKana: [''],
        president: [''],
        established: [''],
        business: [''],
        capital: ['']
      }),
      // 事業所情報
      officesForm: this.fb.array([
        this.createOfficeForm()
      ]),
      // 保険情報
      insurance: this.fb.group({
        healthType: [''],
        pensionStatus: ['']
      }),
      // 給与情報
      salary: this.fb.group({
        closingDay: [''],
        paymentDay: [''],
        paymentTiming: ['']
      }),
      // 担当者情報
      staff: this.fb.group({
        staffName: [''],
        staffContact: [''],
        adminAccount: ['']
      })
    });
  }

  async ngOnInit() {
    // Firestoreから会社情報を取得してフォームに反映
    const ref = doc(this.firestore, 'company', 'main');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
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
      officeName: [''],
      officeAddress: [''],
      applicableOfficeNo: [''],
      officeType: [''],
      prefecture: ['']
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
  }

  async save() {
    if (this.companyForm.invalid) {
      this.message = '必須項目を入力してください。';
      return;
    }
    this.loading = true;
    const ref = doc(this.firestore, 'company', 'main');
    await setDoc(ref, this.companyForm.value, { merge: true });
    this.message = '保存しました。';
    this.loading = false;
  }
} 