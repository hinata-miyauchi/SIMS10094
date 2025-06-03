import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * 実在する日付かどうかをチェックするバリデーター
 * birth_year/month/day または entry_year/month/day のような3フィールドを対象
 */
export function validDateValidator(
  yearField: string,
  monthField: string,
  dayField: string,
  errorKey: string = 'invalidDate'
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const year = group.get(yearField)?.value;
    const month = group.get(monthField)?.value;
    const day = group.get(dayField)?.value;

    if (!year || !month || !day) {
      return null; // 空は別の required バリデーションに任せる
    }

    const y = Number(year);
    const m = Number(month);
    const d = Number(day);

    const date = new Date(y, m - 1, d);

    const isValid =
      date.getFullYear() === y &&
      date.getMonth() === m - 1 &&
      date.getDate() === d;

    return isValid ? null : { [errorKey]: true };
  };
} 