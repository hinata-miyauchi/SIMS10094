import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface SocialInsuranceStatus {
  employeeNo: string;
  name: string;
  status: '在籍中' | '退職済み';
  healthInsurance: boolean;
  nursingCareInsurance: boolean;
  pension: boolean;
  acquisitionDate: string;
  lossDate?: string;
  remarks?: string;
}

@Component({
  selector: 'app-social-insurance-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social-insurance-status.component.html',
  styleUrls: ['./social-insurance-status.component.scss']
})
export class SocialInsuranceStatusComponent {
  statuses: SocialInsuranceStatus[] = [
    {
      employeeNo: '1001',
      name: '山田 太郎',
      status: '在籍中',
      healthInsurance: true,
      nursingCareInsurance: true,
      pension: true,
      acquisitionDate: '2022/04/01',
      remarks: ''
    },
    {
      employeeNo: '1002',
      name: '佐藤 花子',
      status: '退職済み',
      healthInsurance: false,
      nursingCareInsurance: false,
      pension: false,
      acquisitionDate: '2021/05/01',
      lossDate: '2023/03/31',
      remarks: ''
    }
  ];

  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/home']);
  }
} 