import { Component, Input, Output, EventEmitter, forwardRef, ElementRef, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';


@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="relative w-full text-sm">
      <div class="relative cursor-pointer" (click)="toggleOpen()">
        <input type="text"
               [placeholder]="placeholder"
               [ngModel]="displayValue()"
               (ngModelChange)="onSearchChange($event)"
               (focus)="open = true"
               class="w-full px-3 py-2.5 rounded-xl border border-oas-line bg-oas-bg focus:outline-none focus:ring-2 focus:ring-oas-accent/40 transition text-oas-ink pr-8 truncate cursor-text"
               [class.bg-white]="open"
               [disabled]="disabled" />
        <div class="absolute right-3 top-1/2 -translate-y-1/2 text-oas-muted pointer-events-none">
          <svg class="w-4 h-4 transition-transform" [class.rotate-180]="open" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>
      
      @if (open) {
        <div class="absolute z-50 w-full mt-1 bg-white border border-oas-line rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
          @if (filteredOptions().length === 0) {
            <div class="px-3 py-3 text-oas-muted text-center text-xs">Aucun résultat</div>
          } @else {
            @for (opt of filteredOptions(); track opt[bindValue]) {
              <div (click)="selectOption(opt)"
                   class="px-3 py-2.5 hover:bg-oas-bg cursor-pointer transition text-oas-ink border-b border-oas-line/50 last:border-0 flex items-center justify-between"
                   [class.bg-oas-accent]="value === opt[bindValue]"
                   [class.text-white]="value === opt[bindValue]"
                   [class.font-bold]="value === opt[bindValue]">
                <span>{{ getLabel(opt) }}</span>
                @if (value === opt[bindValue]) {
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                }
              </div>
            }
          }
        </div>
      }
    </div>
  `
})
export class SearchableSelectComponent implements ControlValueAccessor {
  @Input() options: any[] = [];
  @Input() bindValue: string = 'id';
  @Input() bindLabel: string | ((opt: any) => string) = 'nom';
  @Input() placeholder: string = 'Sélectionner...';
  @Output() change = new EventEmitter<any>();

  value: any = null;
  disabled = false;
  open = false;
  searchTerm: string | null = null;

  onChange: any = () => {};
  onTouch: any = () => {};

  constructor(private eRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  getLabel(opt: any): string {
    if (!opt) return '';
    if (typeof this.bindLabel === 'function') {
      return this.bindLabel(opt);
    }
    return opt[this.bindLabel] || '';
  }

  displayValue(): string {
    if (this.open && this.searchTerm !== null) {
      return this.searchTerm;
    }
    if (this.value !== null && this.value !== undefined) {
      const selected = this.options.find(o => o[this.bindValue] === this.value);
      return selected ? this.getLabel(selected) : '';
    }
    return '';
  }

  filteredOptions() {
    if (!this.searchTerm) return this.options;
    const term = this.searchTerm.toLowerCase();
    return this.options.filter(o => this.getLabel(o).toLowerCase().includes(term));
  }

  onSearchChange(term: string) {
    this.searchTerm = term;
    this.open = true;
    if (term === '') {
      this.selectOption(null);
    }
  }

  toggleOpen() {
    if (this.disabled) return;
    this.open = true;
    this.searchTerm = null;
  }

  close() {
    this.open = false;
    this.searchTerm = null;
    this.onTouch();
  }

  selectOption(opt: any) {
    this.value = opt ? opt[this.bindValue] : null;
    this.onChange(this.value);
    this.change.emit(this.value);
    this.close();
  }

  writeValue(obj: any): void {
    this.value = obj;
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
