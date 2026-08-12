import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface WarningItem {
  id: string;
  label: string;
  shortLabel: string;
  slug: string;
  index: number;
}

@Component({
  selector: 'app-dashboard-warnings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-warnings.html',
  styleUrl: './dashboard-warnings.css',
})
export class DashboardWarningsComponent {
  @Input() activeIndex: number = 0;
  @Output() warningSelected = new EventEmitter<{ slug: string; index: number }>();

  warnings: WarningItem[] = [
    { id: 'mecanique', label: 'Mécanique', shortLabel: 'Mécanique', slug: 'mecanique', index: 0 },
    { id: 'electricite', label: 'Électricité', shortLabel: 'Électrique', slug: 'electricite', index: 1 },
    { id: 'vidange', label: 'Vidange', shortLabel: 'Vidange', slug: 'vidange', index: 2 },
    { id: 'climatisation', label: 'Climatisation', shortLabel: 'Clim', slug: 'climatisation', index: 3 },
    { id: 'tolerie', label: 'Tôlerie', shortLabel: 'Tôlerie', slug: 'tolerie', index: 4 },
    { id: 'peinture', label: 'Peinture', shortLabel: 'Peinture', slug: 'peinture', index: 5 }
  ];

  selectWarning(warning: WarningItem): void {
    this.warningSelected.emit({ slug: warning.slug, index: warning.index });
  }
}
