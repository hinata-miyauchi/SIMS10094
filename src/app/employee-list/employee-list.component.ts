import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { getFirestore, collection, addDoc, getDocs, onSnapshot, QueryDocumentSnapshot, DocumentData, deleteDoc, doc } from '@angular/fire/firestore';

interface Employee {
  id?: string;
  name: string;
  employeeNo: string;
  birth: string;
  gender: string;
  address: string;
  myNumber: string;
  employmentType: string;
  joinDate: string;
  leaveDate: string;
  department: string;
  office: string;
  salary: number;
  bonus: number;
}

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.scss']
})
export class EmployeeListComponent implements OnInit {
  employees: Employee[] = [];

  // 登録フォーム用
  newEmployee: Employee = {
    name: '', employeeNo: '', birth: '', gender: '', address: '', myNumber: '', employmentType: '', joinDate: '', leaveDate: '', department: '', office: '', salary: 0, bonus: 0
  };
  registerMessage = '';

  // 検索用
  keyword = '';
  department = '';
  employmentType = '';

  async ngOnInit() {
    const db = getFirestore();
    // リアルタイム取得
    onSnapshot(collection(db, 'employees'), (snapshot) => {
      this.employees = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() } as Employee));
    });
  }

  get filteredEmployees() {
    return this.employees.filter(e =>
      (!this.keyword || e.name.includes(this.keyword) || e.employeeNo.includes(this.keyword)) &&
      (!this.department || e.department === this.department) &&
      (!this.employmentType || e.employmentType === this.employmentType)
    );
  }

  async registerEmployee() {
    const db = getFirestore();
    try {
      await addDoc(collection(db, 'employees'), this.newEmployee);
      this.registerMessage = '登録しました';
      this.newEmployee = { name: '', employeeNo: '', birth: '', gender: '', address: '', myNumber: '', employmentType: '', joinDate: '', leaveDate: '', department: '', office: '', salary: 0, bonus: 0 };
    } catch (e) {
      this.registerMessage = '登録に失敗しました';
    }
  }

  async deleteEmployee(id: string, name: string) {
    if (!confirm(`本当に「${name}」さんの従業員情報を削除しますか？`)) return;
    if (!confirm('この操作は元に戻せません。本当に削除してよろしいですか？')) return;
    const db = getFirestore();
    await deleteDoc(doc(db, 'employees', id));
  }
} 