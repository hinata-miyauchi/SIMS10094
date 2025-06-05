import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './leave-management.component.html',
  styleUrls: ['./leave-management.component.scss']
})
export class LeaveManagementComponent implements OnInit {
  leaveList: any[] = [];

  constructor(private firestore: Firestore, private auth: Auth) {}

  async ngOnInit() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    const colRef = query(collection(this.firestore, 'employees'), where('uid', '==', uid));
    const snap = await getDocs(colRef);
    this.leaveList = snap.docs
      .map(doc => {
        const data = doc.data();
        return {
          employee_no: data['employee_no'],
          full_name: (data['last_name'] || '') + ' ' + (data['first_name'] || ''),
          leave_start: data['leave_start'],
          leave_end: data['leave_end'],
          leave_reason: data['leave_reason'],
          status: data['status']
        };
      })
      .filter(emp => emp.leave_start || emp.leave_end || emp.leave_reason || emp.status === '休職');
  }
} 