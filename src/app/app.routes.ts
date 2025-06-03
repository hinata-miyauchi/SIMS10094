import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { MasterCsvImportComponent } from './master-csv-import/master-csv-import.component';
import { HomeComponent } from './home/home.component';
import { EmployeeListComponent } from './employee-list/employee-list.component';
import { CompanyInfoComponent } from './company-info/company-info.component';
import { EmployeePremiumCalcComponent } from './employee-premium-calc/employee-premium-calc.component';
import { SalaryManagementComponent } from './salary-management/salary-management.component';
import { InsuranceRateListComponent } from './insurance-rate-list/insurance-rate-list.component';
import { SocialInsuranceStatusComponent } from './social-insurance-status/social-insurance-status.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'master-csv-import', component: MasterCsvImportComponent },
  { path: 'employee-list', component: EmployeeListComponent },
  { path: 'home', component: HomeComponent },
  { path: 'company-info', component: CompanyInfoComponent },
  { path: 'employee-premium-calc', component: EmployeePremiumCalcComponent },
  { path: 'salary-management', component: SalaryManagementComponent },
  { path: 'insurance-rate-list', component: InsuranceRateListComponent },
  { path: 'social-insurance-status', component: SocialInsuranceStatusComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
];
