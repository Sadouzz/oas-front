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
    { id: 'engine', label: 'Moteur & Mécanique', shortLabel: 'Moteur', slug: 'mecanique-generale', index: 0 },
    { id: 'diag', label: 'Diagnostic Électronique', shortLabel: 'Diag', slug: 'diagnostic-electronique', index: 1 },
    { id: 'oil', label: 'Pression d\'Huile', shortLabel: 'Huile', slug: 'entretien-vidange', index: 2 },
    { id: 'brakes', label: 'Système de Freinage', shortLabel: 'Freins', slug: 'freinage-suspension', index: 3 },
    { id: 'ac', label: 'Climatisation', shortLabel: 'Clim', slug: 'climatisation', index: 4 },
    { id: 'battery', label: 'Batterie & Charge', shortLabel: 'Batterie', slug: 'electricite-batterie', index: 5 },
    { id: 'bodywork', label: 'Carrosserie & Peinture', shortLabel: 'Carrosserie', slug: 'carrosserie-peinture', index: 6 },
    { id: 'tpms', label: 'Pression des Pneus', shortLabel: 'Pneus', slug: 'pneumatiques', index: 7 },
    { id: 'towing', label: 'Dépannage & Remorquage', shortLabel: 'Remorquage', slug: 'remorquage', index: 8 },
  ];

  selectWarning(warning: WarningItem): void {
    this.warningSelected.emit({ slug: warning.slug, index: warning.index });
  }
}
