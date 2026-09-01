import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-section-title',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './section-title.html',
  styleUrls: ['./section-title.css']
})
export class SectionTitle {
  @Input() mainTitle: string = '';
  @Input() highlightedText: string = '';
  @Input() subtitle: string = '';
  @Input() align: 'left' | 'center' | 'right' = 'center';
  @Input() theme: 'light' | 'dark' | 'accent' = 'light';
}
