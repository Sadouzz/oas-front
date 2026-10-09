import { Component, Input, Output, EventEmitter, forwardRef, ElementRef, HostListener } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ],
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
            @for (opt of filteredOptions(); track (opt && opt[bindValue] != null ? opt[bindValue] : $index)) {
              <div (click)="selectOption(opt)"
                   class="px-3 py-2.5 cursor-pointer transition border-b border-oas-line/50 last:border-0 flex items-center justify-between"
                   [ngClass]="isSelected(opt) 
                     ? 'bg-oas-accent-bg text-oas-accent-dark font-bold hover:bg-oas-accent-bg/80' 
                     : 'text-oas-ink hover:bg-oas-bg'">
                <span>{{ getLabel(opt) }}</span>
                @if (isSelected(opt)) {
                  <svg class="w-4 h-4 text-oas-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                }
              </div>
            }
          }

          @if (addNewLabel) {
            <div (click)="onAddNewClick($event)"
                 class="px-3 py-2.5 bg-slate-50 hover:bg-oas-accent/10 text-oas-accent font-semibold cursor-pointer transition border-t border-oas-line sticky bottom-0 flex items-center gap-2 text-xs">
              <div class="w-4 h-4 rounded-full bg-oas-accent/15 text-oas-accent flex items-center justify-center flex-shrink-0">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span class="truncate">{{ addNewLabel }}</span>
            </div>
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
  @Input() serverSearch: boolean = false;
  @Input() addNewLabel?: string;
  @Output() change = new EventEmitter<any>();
  @Output() search = new EventEmitter<string>();
  @Output() addNew = new EventEmitter<void>();

  value: any = null;
  selectedOption: any = null;
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
    if (typeof opt === 'string') return opt;
    if (typeof this.bindLabel === 'function') {
      return this.bindLabel(opt);
    }
    return opt[this.bindLabel] ?? '';
  }

  isSelected(opt: any): boolean {
    if (this.value === null || this.value === undefined || opt === null || opt === undefined) return false;
    if (typeof opt === 'string') return this.value === opt;
    return this.value === opt[this.bindValue];
  }

  displayValue(): string {
    if (this.open && this.searchTerm !== null) {
      return this.searchTerm;
    }
    if (this.value !== null && this.value !== undefined) {
      const selected = (this.options || []).find(o => {
        if (!o) return false;
        if (typeof o === 'string') return o === this.value;
        return o[this.bindValue] === this.value;
      }) || (this.selectedOption && (this.selectedOption[this.bindValue] === this.value || this.selectedOption === this.value) ? this.selectedOption : null);
      return selected ? this.getLabel(selected) : (typeof this.value === 'string' ? this.value : '');
    }
    return '';
  }

  filteredOptions() {
    const list = this.options || [];
    if (this.serverSearch || !this.searchTerm) return list;
    const term = this.searchTerm.trim().toLowerCase();
    return list.filter(o => {
      if (!o) return false;
      const label = this.getLabel(o).toLowerCase();
      if (label.includes(term)) return true;
      if (typeof o === 'object') {
        const ref = (o.reference || '').toLowerCase();
        const des = (o.designation || o.description || '').toLowerCase();
        const nom = (o.nom || o.prenom || o.matricule || o.immatriculation || '').toLowerCase();
        if (ref.includes(term) || des.includes(term) || nom.includes(term)) return true;
      }
      return false;
    });
  }

  onSearchChange(term: string) {
    this.searchTerm = term;
    this.open = true;
    this.search.emit(term);
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

  onAddNewClick(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    this.close();
    this.addNew.emit();
  }

  selectOption(opt: any) {
    this.selectedOption = opt;
    if (opt == null) {
      this.value = null;
    } else if (typeof opt === 'string') {
      this.value = opt;
    } else {
      this.value = opt[this.bindValue] !== undefined ? opt[this.bindValue] : opt;
    }
    this.onChange(this.value);
    this.change.emit(this.value);
    this.close();
  }

  writeValue(obj: any): void {
    this.value = obj;
    if (obj == null) {
      this.selectedOption = null;
    }
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
