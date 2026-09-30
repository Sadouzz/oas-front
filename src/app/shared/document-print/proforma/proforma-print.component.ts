import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { montantEnLettresFCFA } from '../utils/montant-en-lettres.util';

@Component({
  selector: 'app-proforma-print',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  templateUrl: './proforma-print.component.html',
  styleUrls: ['./proforma-print.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ProformaPrintComponent {
  @Input() data: any;

  imprimer(): void {
    window.print();
  }

  getClientNom(): string {
    if (!this.data) return '-';
    if (this.data.client?.nom) return this.data.client.nom;
    if (this.data.client?.firstName || this.data.client?.lastName) {
      return `${this.data.client?.firstName || ''} ${this.data.client?.lastName || ''}`.trim();
    }
    return this.data.clientNom || '-';
  }

  getClientTelephone(): string {
    if (!this.data) return '-';
    return this.data.client?.telephone || this.data.client?.phone || this.data.clientTelephone || '-';
  }

  getClientEmail(): string {
    if (!this.data) return '-';
    return this.data.client?.email || this.data.clientEmail || '-';
  }

  getClientAdresse(): string {
    if (!this.data) return '-';
    return this.data.client?.adresse || this.data.client?.address || this.data.clientAdresse || '-';
  }

  getLignes(): any[] {
    if (!this.data) return [];
    if (Array.isArray(this.data.lignes) && this.data.lignes.length > 0) {
      return this.data.lignes;
    }
    if (Array.isArray(this.data.lignesPieces) && this.data.lignesPieces.length > 0) {
      return this.data.lignesPieces;
    }
    return [];
  }

  getLignePrix(ligne: any): number {
    if (!ligne) return 0;
    return ligne.prixUnitaire ?? ligne.prix ?? (ligne.quantite && ligne.montantTotal ? (ligne.montantTotal / ligne.quantite) : 0);
  }

  getLigneTotal(ligne: any): number {
    if (!ligne) return 0;
    if (ligne.totalLigne != null) return ligne.totalLigne;
    if (ligne.montantTotal != null) return ligne.montantTotal;
    const qty = ligne.quantite || 0;
    const prix = this.getLignePrix(ligne);
    const remise = ligne.remise || 0;
    return remise > 0 ? (qty * prix * (1 - remise / 100)) : (qty * prix);
  }

  getTotalHT(): number {
    if (!this.data) return 0;
    return this.data.totalHT ?? this.data.totalHt ?? 0;
  }

  getTVA(): number {
    if (!this.data) return 0;
    return this.data.tva ?? this.data.montantTva ?? 0;
  }

  getTimbre(): number {
    if (!this.data) return 0;
    return this.data.timbre ?? 0;
  }

  getTotalTTC(): number {
    if (!this.data) return 0;
    return this.data.totalTTC ?? this.data.totalTtc ?? 0;
  }

  getMontantEnLettres(): string {
    if (!this.data) return 'zéro franc CFA';
    if (this.data.montantEnLettres) {
      return this.data.montantEnLettres;
    }
    const ttc = this.getTotalTTC();
    return montantEnLettresFCFA(ttc);
  }
}
