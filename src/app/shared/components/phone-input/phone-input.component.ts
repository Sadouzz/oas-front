import { Component, ElementRef, forwardRef, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, Validator, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import intlTelInput from 'intl-tel-input';
import { CommonModule } from '@angular/common';
import { phoneNumberValidator, sanitizePhoneInput } from '../../validators/phone-number.validator';

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  styles: [':host { display: block; width: 100%; } :host ::ng-deep .iti { display: block; width: 100%; }'],
  template: `
    <div class="relative w-full">
      <input
        #phoneInput
        type="tel"
        class="w-full py-2.5 pr-4 rounded-lg border border-oas-line bg-oas-bg text-sm focus:outline-none focus:ring-2 focus:ring-oas-accent/40 focus:border-oas-accent transition placeholder-oas-faint"
        [class.border-oas-bad]="invalid"
        [placeholder]="placeholder"
        (input)="onInputChange($event)"
        (blur)="onTouched()"
        [disabled]="disabled"
      />
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    }
  ]
})
export class PhoneInputComponent implements ControlValueAccessor, Validator, AfterViewInit, OnDestroy {
  @ViewChild('phoneInput') phoneInputRef!: ElementRef<HTMLInputElement>;
  @Input() invalid = false;
  @Input() placeholder = '';

  private iti: any;
  disabled = false;
  value = '';

  onChange: any = () => {};
  onTouched: any = () => {};
  private onValidatorChange: () => void = () => {};

  ngAfterViewInit() {
    this.iti = intlTelInput(this.phoneInputRef.nativeElement, {
      initialCountry: 'sn',
      strictMode: true,
      separateDialCode: true,
      loadUtils: () => import('intl-tel-input/utils')
    });
    this.onValidatorChange();

    if (this.value) {
      this.iti.setNumber(this.value);
    }

    this.phoneInputRef.nativeElement.addEventListener('countrychange', () => {
      this.onInputChange();
    });
  }

  ngOnDestroy() {
    if (this.iti) {
      this.iti.destroy();
    }
  }

  onInputChange(event?: Event) {
    if (this.iti) {
      const input = event?.target as HTMLInputElement | undefined;
      if (input) input.value = sanitizePhoneInput(input.value);
      const isValid = this.iti.isValidNumber();
      if (isValid) {
        this.value = this.iti.getNumber();
      } else {
        // You can return the raw value or null if you want it strict
        this.value = this.phoneInputRef.nativeElement.value;
      }
      this.onChange(this.value);
    }
  }

  writeValue(value: any): void {
    this.value = value;
    if (this.iti && value) {
      this.iti.setNumber(value);
    } else if (this.phoneInputRef) {
      this.phoneInputRef.nativeElement.value = value || '';
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const formatErrors = phoneNumberValidator()(control);
    if (formatErrors) return formatErrors;
    if (!this.iti || !control.value) return null;
    return this.iti.isValidNumber() ? null : { invalidPhone: true };
  }
}
