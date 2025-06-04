import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth, createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth';

@Component({
  selector: 'app-account-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './account-create.component.html',
  styleUrls: ['./account-create.component.scss']
})
export class AccountCreateComponent {
  email = '';
  password = '';
  confirmPassword = '';
  username = '';
  errorMessage = '';
  successMessage = '';
  loading = false;
  hide = true;
  hideConfirm = true;

  constructor(private auth: Auth) {}

  async onRegister() {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.email || !this.password || !this.confirmPassword || !this.username) {
      this.errorMessage = '全ての項目を入力してください。';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'パスワードが一致しません。';
      return;
    }
    this.loading = true;
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, this.email, this.password);
      if (cred.user) {
        await updateProfile(cred.user, { displayName: this.username });
      }
      this.successMessage = 'アカウント作成が完了しました。ログイン画面からログインしてください。';
      this.email = '';
      this.password = '';
      this.confirmPassword = '';
      this.username = '';
    } catch (e: any) {
      this.errorMessage = e.message || 'アカウント作成に失敗しました。';
    }
    this.loading = false;
  }
}
