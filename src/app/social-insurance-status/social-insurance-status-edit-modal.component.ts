import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-social-insurance-status-edit-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop" (click)="onCancel()"></div>
    <div class="modal-content">
      <h2 class="modal-title">社会保険情報編集</h2>
      <table class="edit-table">
        <tr>
          <th>従業員番号</th>
          <td>{{employeeNo}}</td>
        </tr>
        <tr>
          <th>氏名</th>
          <td>{{name}}</td>
        </tr>
        <tr>
          <th>健康保険</th>
          <td>
            <label class="switch">
              <input type="checkbox" [(ngModel)]="healthInsurance">
              <span class="slider"></span>
            </label>
            <span class="label-text">{{healthInsurance ? '加入' : '未加入'}}</span>
          </td>
        </tr>
        <tr>
          <th>介護保険</th>
          <td>
            <label class="switch">
              <input type="checkbox" [(ngModel)]="nursingCareInsurance">
              <span class="slider"></span>
            </label>
            <span class="label-text">{{nursingCareInsurance ? '加入' : '未加入'}}</span>
          </td>
        </tr>
        <tr>
          <th>厚生年金</th>
          <td>
            <label class="switch">
              <input type="checkbox" [(ngModel)]="pension">
              <span class="slider"></span>
            </label>
            <span class="label-text">{{pension ? '加入' : '未加入'}}</span>
          </td>
        </tr>
      </table>
      <div class="modal-actions">
        <button class="btn primary" (click)="onSave()">保存</button>
        <button class="btn" (click)="onCancel()">キャンセル</button>
        <button class="btn secondary" (click)="onAuto()">自動判定に戻す</button>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop { position: fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.3); z-index:1000; }
    .modal-content { position: fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#fff; padding:2.5rem 2rem 2rem 2rem; border-radius:12px; z-index:1001; min-width:340px; box-shadow:0 4px 24px rgba(0,0,0,0.15); }
    .modal-title { font-size: 1.3rem; font-weight: bold; margin-bottom: 1.2rem; color: #333; }
    .edit-table { width: 100%; border-collapse: separate; border-spacing: 0 0.5rem; margin-bottom: 1.5rem; }
    .edit-table th { text-align: left; color: #555; font-weight: 600; width: 7em; padding-right: 1em; }
    .edit-table td { color: #222; }
    .label-text { margin-left: 0.7em; font-size: 0.98em; color: #444; }
    .modal-actions { margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: flex-end; }
    .btn { padding: 0.5em 1.3em; border-radius: 5px; border: none; font-size: 1em; cursor: pointer; background: #e0e0e0; color: #222; transition: background 0.2s; }
    .btn.primary { background: #1976d2; color: #fff; }
    .btn.primary:hover { background: #1565c0; }
    .btn.secondary { background: #fffbe6; color: #bfa100; border: 1px solid #ffe066; }
    .btn.secondary:hover { background: #fff3bf; }
    .btn:hover { background: #bdbdbd; }
    /* スイッチ風チェックボックス */
    .switch { position: relative; display: inline-block; width: 38px; height: 22px; vertical-align: middle; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; border-radius: 22px; transition: .4s; }
    .switch input:checked + .slider { background-color: #1976d2; }
    .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; border-radius: 50%; transition: .4s; }
    .switch input:checked + .slider:before { transform: translateX(16px); }
  `]
})
export class SocialInsuranceStatusEditModalComponent {
  @Input() employeeNo!: string;
  @Input() name!: string;
  @Input() healthInsurance!: boolean;
  @Input() nursingCareInsurance!: boolean;
  @Input() pension!: boolean;
  @Output() save = new EventEmitter<{healthInsurance: boolean, nursingCareInsurance: boolean, pension: boolean, manualInsuranceEdit: boolean}>();
  @Output() cancel = new EventEmitter<void>();
  @Output() auto = new EventEmitter<void>();

  onSave() {
    this.save.emit({
      healthInsurance: this.healthInsurance,
      nursingCareInsurance: this.nursingCareInsurance,
      pension: this.pension,
      manualInsuranceEdit: true
    });
  }
  onCancel() {
    this.cancel.emit();
  }
  onAuto() {
    this.save.emit({
      healthInsurance: this.healthInsurance,
      nursingCareInsurance: this.nursingCareInsurance,
      pension: this.pension,
      manualInsuranceEdit: false
    });
  }
} 