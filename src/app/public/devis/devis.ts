import { Component } from '@angular/core';
import { sanitizePhoneInput } from '../../shared/validators/phone-number.validator';

@Component({
  selector: 'app-devis',
  imports: [],
  templateUrl: './devis.html',
  styleUrl: './devis.css',
})
export class Devis {
  sanitizeTelephone(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = sanitizePhoneInput(input.value);
  }
}
