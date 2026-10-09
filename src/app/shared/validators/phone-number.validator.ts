import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const PHONE_CHARACTERS = /^\+?[0-9][0-9() .-]*$/;

export function phoneNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;

    const digits = value.replace(/\D/g, '');
    return PHONE_CHARACTERS.test(value) && digits.length >= 7 && digits.length <= 15
      ? null
      : { invalidPhone: true };
  };
}

export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^0-9+() .-]/g, '').replace(/(?!^)\+/g, '');
}
