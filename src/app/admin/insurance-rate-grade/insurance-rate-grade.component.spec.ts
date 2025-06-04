import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsuranceRateGradeComponent } from './insurance-rate-grade.component';

describe('InsuranceRateGradeComponent', () => {
  let component: InsuranceRateGradeComponent;
  let fixture: ComponentFixture<InsuranceRateGradeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsuranceRateGradeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InsuranceRateGradeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
