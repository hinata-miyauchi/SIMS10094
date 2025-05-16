import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  hide = true;
  errorMessage = '';
  private auth: Auth = inject(Auth);

  constructor(private fb: FormBuilder, private router: Router) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onLogin() {
    if (this.loginForm.invalid) return;
    const { email, password } = this.loginForm.value;
    try {
      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      if (cred.user.email !== 'admin@gmail.com') {
        await this.auth.signOut();
        this.errorMessage = '管理者のみログイン可能です。';
        return;
      }
      this.router.navigate(['/home']);
    } catch (error: any) {
      this.errorMessage = error.message;
    }
  }
} 