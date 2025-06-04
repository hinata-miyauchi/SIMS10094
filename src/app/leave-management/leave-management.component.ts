import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './leave-management.component.html',
  styleUrls: ['./leave-management.component.scss']
})
export class LeaveManagementComponent implements OnInit {
  leaveList: any[] = [];

  constructor(private firestore: Firestore) {}

  async ngOnInit() {
    const colRef = collection(this.firestore, 'employees');
    const snap = await getDocs(colRef);
    this.leaveList = snap.docs
      .map(doc => doc.data())
      .filter(emp => emp['status'] === '休職');
  }
} 