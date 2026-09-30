import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-devis-previsionnel-print',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  templateUrl: './devis-previsionnel-print.component.html',
  styleUrls: ['./devis-previsionnel-print.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class DevisPrevisionnelPrintComponent {
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

  getMontantEstime(): number {
    if (!this.data) return 0;
    return this.data.montantEstime ?? this.data.montantTotal ?? 0;
  }

  /** Convertit les sauts de ligne en <br> pour affichage HTML (équivalent nl2br PHP) */
  getReparationsHtml(): string {
    const text = this.data?.reparations || this.data?.notesReparation || '-';
    // Remplace les \r\n, \n et \r par <br>
    return text.replace(/\r\n|\r|\n/g, '<br>');
  }
}
