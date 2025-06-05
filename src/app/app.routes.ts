import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
// import { MasterCsvImportComponent } from './master-csv-import/master-csv-import.component';
import { HomeComponent } from './home/home.component';
import { EmployeeListComponent } from './employee-list/employee-list.component';
import { CompanyInfoComponent } from './company-info/company-info.component';
import { EmployeePremiumCalcComponent } from './employee-premium-calc/employee-premium-calc.component';
import { SalaryManagementComponent } from './salary-management/salary-management.component';
import { InsuranceRateListComponent } from './insurance-rate-list/insurance-rate-list.component';
import { SocialInsuranceStatusComponent } from './social-insurance-status/social-insurance-status.component';
import { AdminComponent } from './admin/admin.component';
import { InsuranceRateGradeComponent } from './admin/insurance-rate-grade/insurance-rate-grade.component';
import { AccountCreateComponent } from './admin/account-create/account-create.component';
import { AdminAuthComponent } from './admin-auth/admin-auth.component';
import { AdminInsuranceRateListComponent } from './admin/insurance-rate-list/insurance-rate-list.component';
import { GradeManagementComponent } from './grade-management/grade-management.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'employee-list', component: EmployeeListComponent },
  { path: 'home', component: HomeComponent },
  { path: 'company-info', component: CompanyInfoComponent },
  { path: 'employee-premium-calc', component: EmployeePremiumCalcComponent },
  { path: 'salary-management', component: SalaryManagementComponent },
  { path: 'insurance-rate-list', component: InsuranceRateListComponent },
  { path: 'social-insurance-status', component: SocialInsuranceStatusComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'admin/insurance-rate-grade', component: InsuranceRateGradeComponent },
  { path: 'admin/account-create', component: AccountCreateComponent },
  { path: 'admin-auth', component: AdminAuthComponent },
  { path: 'admin/insurance-rate-list', component: AdminInsuranceRateListComponent },
  { path: 'grade-management', component: GradeManagementComponent },
  { path: 'leave-management', loadComponent: () => import('./leave-management/leave-management.component').then(m => m.LeaveManagementComponent) },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
];
