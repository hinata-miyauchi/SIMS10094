import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-auth.component.html',
  styleUrls: ['./admin-auth.component.scss']
})
export class AdminAuthComponent {
  adminPassword = '';
  errorMessage = '';
  loading = false;
  hide = true;
  private readonly ADMIN_SECRET = 'admin10094';

  constructor(private router: Router) {}

  onSubmit() {
    this.errorMessage = '';
    if (this.adminPassword === this.ADMIN_SECRET) {
      this.router.navigate(['/admin']);
    } else {
      this.errorMessage = 'パスワードが違います。';
    }
  }
}
