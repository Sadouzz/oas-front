import { FormControl } from '@angular/forms';
import { phoneNumberValidator, sanitizePhoneInput } from './phone-number.validator';

describe('phoneNumberValidator', () => {
  const validate = phoneNumberValidator();

  it('accepts international numbers with common separators', () => {
    expect(validate(new FormControl('+221 77 123 45 67'))).toBeNull();
    expect(validate(new FormControl('+33 (0)6-12-34-56-78'))).toBeNull();
  });

  it('rejects letters and numbers outside the supported digit count', () => {
    expect(validate(new FormControl('+221 77 ABC 45 67'))).toEqual({ invalidPhone: true });
    expect(validate(new FormControl('123456'))).toEqual({ invalidPhone: true });
    expect(validate(new FormControl('1234567890123456'))).toEqual({ invalidPhone: true });
  });

  it('allows empty optional phone fields', () => {
    expect(validate(new FormControl(''))).toBeNull();
  });

  it('removes letters pasted or typed into the phone control', () => {
    expect(sanitizePhoneInput('+221 AB77-123')).toBe('+221 77-123');
  });
});
