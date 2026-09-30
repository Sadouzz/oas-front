import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DevisPrevisionnelPrintComponent } from './devis-previsionnel/devis-previsionnel-print.component';
import { ProformaPrintComponent } from './proforma/proforma-print.component';

@Component({
  selector: 'app-document-print',
  standalone: true,
  imports: [CommonModule, DevisPrevisionnelPrintComponent, ProformaPrintComponent],
  templateUrl: './document-print.component.html',
  styleUrls: ['./document-print.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class DocumentPrintComponent {
  @Input() data: any;
  @Input() typeDocument: 'DEVIS_PREVISIONNEL' | 'PROFORMA' = 'DEVIS_PREVISIONNEL';

  /**
   * Déclenche l'impression native du navigateur
   * Grâce au @media print, seul le document A4 est imprimé
   */
  imprimer(): void {
    window.print();
  }
}
