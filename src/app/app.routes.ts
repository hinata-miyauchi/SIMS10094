import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { MasterCsvImportComponent } from './master-csv-import/master-csv-import.component';
import { HomeComponent } from './home/home.component';
import { GradeCsvImportComponent } from './grade-csv-import/grade-csv-import.component';
import { EmployeeListComponent } from './employee-list/employee-list.component';
import { CompanyInfoComponent } from './company-info/company-info.component';
import { EmployeePremiumCalcComponent } from './employee-premium-calc/employee-premium-calc.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'master-csv-import', component: MasterCsvImportComponent },
  { path: 'grade-csv-import', component: GradeCsvImportComponent },
  { path: 'employee-list', component: EmployeeListComponent },
  { path: 'home', component: HomeComponent },
  { path: 'company-info', component: CompanyInfoComponent },
  { path: 'employee-premium-calc', component: EmployeePremiumCalcComponent },
  {
    path: 'insurance-rate-list',
    loadComponent: () => import('./insurance-rate-list/insurance-rate-list.component').then(m => m.InsuranceRateListComponent)
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
];
