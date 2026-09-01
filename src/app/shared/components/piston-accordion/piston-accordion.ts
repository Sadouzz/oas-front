import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';


@Component({
  selector: 'app-piston-accordion',
  standalone: true,
  imports: [],
  templateUrl: './piston-accordion.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './piston-accordion.css'
})
export class PistonAccordionComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() active = false;
  
  @Output() toggle = new EventEmitter<void>();

  onHeaderClick(): void {
    this.toggle.emit();
  }
}
