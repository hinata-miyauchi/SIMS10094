import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CompanyInfoComponent } from './company-info/company-info.component';

const routes: Routes = [
  { path: 'company-info', component: CompanyInfoComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } 