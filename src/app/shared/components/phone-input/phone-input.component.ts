import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    }
  ],
  templateUrl: './phone-input.component.html'
})
export class PhoneInputComponent implements ControlValueAccessor {
  @Input() placeholder = '77 000 00 00';
  @Input() defaultCountryCode = '+221';

  displayValue = '';
  disabled = false;

  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(val: any): void {
    if (!val) {
      this.displayValue = '';
      return;
    }
    const str = String(val);
    this.displayValue = this.extractAndFormatLocal(str);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value || '';

    const formatted = this.extractAndFormatLocal(raw);
    this.displayValue = formatted;
    input.value = formatted;

    const digitsOnly = formatted.replace(/\s+/g, '');
    if (digitsOnly.length > 0) {
      this.onChange(`${this.defaultCountryCode} ${formatted}`);
    } else {
      this.onChange('');
    }
  }

  onBlur(): void {
    this.onTouched();
  }

  private extractAndFormatLocal(val: string): string {
    if (!val) return '';
    // Nettoie: supprime indicatif si déjà présent au début (+221, 00221, 221)
    let clean = val.trim();
    clean = clean.replace(/^(\+221|00221|221)/, '');
    // Ne garde que les chiffres
    clean = clean.replace(/[^0-9]/g, '');
    // Limite à 9 chiffres (standard mobile/fixe sénégalais : 70, 75, 76, 77, 78, 33...)
    clean = clean.slice(0, 9);

    // Formatage espacé progressif: XX XXX XX XX
    if (clean.length <= 2) {
      return clean;
    } else if (clean.length <= 5) {
      return `${clean.slice(0, 2)} ${clean.slice(2)}`;
    } else if (clean.length <= 7) {
      return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`;
    } else {
      return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 7)} ${clean.slice(7, 9)}`;
    }
  }
}
