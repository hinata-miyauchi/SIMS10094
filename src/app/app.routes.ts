import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { MasterCsvImportComponent } from './master-csv-import.component';
import { HomeComponent } from './home.component';
import { GradeCsvImportComponent } from './grade-csv-import.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'master-csv-import', component: MasterCsvImportComponent },
  { path: 'grade-csv-import', component: GradeCsvImportComponent },
  { path: 'home', component: HomeComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
];
