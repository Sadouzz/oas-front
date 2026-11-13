import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientFactureService } from './client-facture.service';
import { FactureDetailsViewModel, FactureListModel, FactureModel } from '../../agent/factures/models/facture.model';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { StatusBadgeComponent, BadgeTone } from '../ui/status-badge/status-badge.component';
import { VehicleAvatarComponent } from '../ui/vehicle-avatar/vehicle-avatar.component';
import { PdfLayoutDialogService } from '../../shared/components/pdf-layout-dialog/pdf-layout-dialog.service';

type SortOrder = 'recent' | 'ancien';

const STATUT_LABELS: Record<FactureListModel['statutPaiement'], string> = {
  NON_PAYE: 'Non payée',
  PARTIEL: 'Partiellement payée',
  PAYE: 'Payée',
};

const STATUT_TONES: Record<FactureListModel['statutPaiement'], BadgeTone> = {
  NON_PAYE: 'danger',
  PARTIEL: 'pending',
  PAYE: 'success',
};

@Component({
  selector: 'app-client-factures',
  standalone: true,
  imports: [CommonModule, AlertComponent, StatusBadgeComponent, VehicleAvatarComponent],
  templateUrl: './client-factures.component.html',
})
export class ClientFacturesComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(ClientFactureService);
  private pdfLayoutDialog = inject(PdfLayoutDialogService);

  factures: FactureListModel[] = [];
  filtered: FactureListModel[] = [];
  selected: FactureDetailsViewModel | null = null;
  selectedLoading = false;
  private detailRequest = 0;
  loading = false;
  errorMessage = '';

  searchTerm = '';
  statutFilter = '';
  sortOrder: SortOrder = 'recent';

  readonly statutLabels = STATUT_LABELS;
  readonly statutTones = STATUT_TONES;
  readonly statutOptions = Object.keys(STATUT_LABELS) as FactureListModel['statutPaiement'][];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.service.getAll().subscribe({
      next: factures => { this.factures = factures; this.loading = false; this.cdr.markForCheck(); this.applyFilter(); this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.errorMessage = 'Impossible de charger vos factures.'; this.cdr.markForCheck(); },
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.factures
      .filter(f => !this.statutFilter || f.statutPaiement === this.statutFilter)
      .filter(f => !term || f.numero?.toLowerCase().includes(term) || (f.immatriculation ?? '').toLowerCase().includes(term))
      .sort((a, b) => {
        const diff = new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime();
        return this.sortOrder === 'recent' ? -diff : diff;
      });
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.applyFilter(); this.cdr.markForCheck();
  }

  onStatutFilter(value: string): void {
    this.statutFilter = value;
    this.applyFilter(); this.cdr.markForCheck();
  }

  onSortChange(value: SortOrder): void {
    this.sortOrder = value;
    this.applyFilter(); this.cdr.markForCheck();
  }

  select(facture: FactureListModel): void {
    const request = ++this.detailRequest;
    this.selected = { ...facture, lignesPieces: [], lignesMainDoeuvres: [], recus: [] };
    this.selectedLoading = true;
    this.errorMessage = '';
    this.service.getById(facture.id).subscribe({
      next: details => { if (request === this.detailRequest) { this.selected = details; this.selectedLoading = false; } this.cdr.markForCheck(); },
      error: () => { if (request === this.detailRequest) { this.selected = null; this.selectedLoading = false; this.errorMessage = 'Impossible de charger le détail de cette facture.'; } this.cdr.markForCheck(); },
    });
  }

  async downloadPdf(facture: Pick<FactureModel, 'id' | 'numero'>): Promise<void> {
    const layoutKey = await this.pdfLayoutDialog.chooseLayout();
    if (!layoutKey) return;
    this.service.downloadPdf(facture.id, layoutKey).subscribe({
      next: blob => this.savePdf(blob, `Facture-${facture.numero || facture.id}-${layoutKey === 'AVEC_ENTETE' ? 'avec-entete' : 'sans-entete'}.pdf`),
      error: () => { this.errorMessage = 'Impossible de télécharger cette facture.'; this.cdr.markForCheck(); },
    });
  }

  private savePdf(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  closeDetail(): void {
    this.detailRequest++;
    this.selected = null;
    this.selectedLoading = false;
  }

  remiseGenerale(facture: Pick<FactureModel, 'lignesPieces' | 'lignesMainDoeuvres'>): number {
    const remisePieces = (facture.lignesPieces ?? []).reduce((s, ligne) => {
      const brut = (Number(ligne.quantite) || 0) * (Number(ligne.prix) || 0);
      const net = Number(ligne.montantTotal ?? Math.round(brut * (1 - (Number(ligne.tauxRemise) || 0) / 100)));
      return s + brut - net;
    }, 0);
    const remiseMo = (facture.lignesMainDoeuvres ?? []).reduce((s, ligne) => {
      const brut = (Number(ligne.nbreHeure) || 0) * (Number(ligne.tarifHoraire) || 0);
      const net = Number(ligne.montantTotal ?? Math.round(brut * (1 - (Number(ligne.tauxRemise) || 0) / 100)));
      return s + brut - net;
    }, 0);
    return remisePieces + remiseMo;
  }
}
