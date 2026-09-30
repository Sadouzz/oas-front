import { Component, inject, OnInit, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DevisPrevisionnelPrintComponent } from '../devis-previsionnel/devis-previsionnel-print.component';
import { ProformaPrintComponent } from '../proforma/proforma-print.component';
import { DevisPrevisionnelService } from '../../../agent/devis-previsionnels/devis-previsionnel.service';
import { ProformaService } from '../../../agent/proforma/proforma.service';
import { montantEnLettresFCFA } from '../utils/montant-en-lettres.util';

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [CommonModule, DevisPrevisionnelPrintComponent, ProformaPrintComponent],
  templateUrl: './document-viewer.component.html',
  styleUrls: ['./document-viewer.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class DocumentViewerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private devisService = inject(DevisPrevisionnelService);
  private proformaService = inject(ProformaService);

  type: string = '';
  id: number = 0;
  loading: boolean = true;
  error: string = '';
  documentData: any = null;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.type = (params['type'] || '').toLowerCase();
      this.id = Number(params['id']);

      if (!this.id || isNaN(this.id)) {
        this.error = 'Identifiant de document invalide.';
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }

      this.chargerDocument();
    });
  }

  chargerDocument(): void {
    this.loading = true;
    this.error = '';

    if (this.type === 'devis' || this.type === 'devis-previsionnel') {
      this.devisService.getById(this.id).subscribe({
        next: (d: any) => {
          const c = d.client as any;
          const v = d.vehicule as any;
          this.documentData = {
            ...d,
            numero: d.numero || ('DK/' + d.id),
            date: d.date || d.dateCreation || d.createdAt || new Date().toISOString(),
            agentNom: d.agentNom || d.agentEmetteur
              || (d.agent ? `${d.agent.firstName || ''} ${d.agent.lastName || ''}`.trim() : 'EL HAJ')
              || 'EL HAJ',
            client: {
              id: c?.id,
              nom: c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : (d.clientNom || '-'),
              telephone: c?.phone || c?.telephone || d.clientTelephone || '-',
              email: c?.email || d.clientEmail || '-',
              adresse: c?.address || c?.adresse || d.clientAdresse || 'Dakar'
            },
            vehicule: {
              annee: v?.annee || d.annee || '-',
              marque: v?.marque || d.marque || '-',
              modele: v?.modele || d.modele || '-',
              immatriculation: v?.immatriculation || d.immatriculation || '-',
              kilometrage: d.kilometrageVehicule || v?.kilometrage || d.kilometrage || '-',
              chassis: v?.numeroChassis || v?.chassis || d.numeroChassis || '-'
            },
            montantEstime: d.montantTotal || 0,
            remarques: d.remarques || 'Sous réserve de vises cachés',
            reparations: d.notesReparation || '-'
          };
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err.error?.message || 'Impossible de récupérer les détails du devis prévisionnel.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    } else if (this.type === 'proforma') {
      this.proformaService.getById(this.id).subscribe({
        next: (target: any) => {
          const c = target.client as any;
          const v = target.vehicule as any;
          this.documentData = {
            ...target,
            numero: target.numero || ('DK/' + target.id),
            date: target.dateCreation || target.createdAt || new Date().toISOString(),
            agentNom: target.agentNom || target.agentEmetteur || (target.agent ? target.agent.nom : 'EL HAJ') || 'EL HAJ',
            client: {
              id: target.clientId || c?.id,
              nom: target.clientNom || (c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : '-'),
              telephone: target.clientTelephone || c?.phone || c?.telephone || '-',
              email: target.clientEmail || c?.email || '-',
              adresse: target.clientAdresse || c?.address || c?.adresse || 'Dakar'
            },
            vehicule: {
              annee: target.annee || v?.annee || '-',
              marque: target.marque || v?.marque || '-',
              modele: target.modele || v?.modele || '-',
              immatriculation: target.immatriculation || v?.immatriculation || '-',
              kilometrage: target.kilometrage || v?.kilometrage || '-',
              chassis: target.numeroChassis || v?.numeroChassis || v?.chassis || '-'
            },
            lignes: (target.lignesPieces || target.lignes || []).map((lp: any) => ({
              reference: lp.referencePiece || lp.reference || '-',
              designation: lp.designationPiece || lp.designationPds || lp.designation || '-',
              quantite: lp.quantite,
              remise: lp.remise || 0,
              prixUnitaire: lp.prixUnitaire || (lp.quantite ? (lp.montantTotal / lp.quantite) : 0),
              totalLigne: lp.montantTotal
            })),
            remarques: target.remarque || target.remarques || '',
            totalHT: target.totalHt ?? target.totalHT ?? 0,
            tva: target.montantTva ?? target.tva ?? 0,
            timbre: target.timbre || 0,
            totalTTC: target.totalTtc ?? target.totalTTC ?? 0,
            montantEnLettres: target.montantEnLettres || montantEnLettresFCFA(target.totalTtc ?? target.totalTTC ?? 0)
          };
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err.error?.message || 'Impossible de récupérer les détails du proforma.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.error = `Type de document "${this.type}" non reconnu.`;
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  getTitreDocument(): string {
    if (this.type === 'devis' || this.type === 'devis-previsionnel') {
      return `Devis Prévisionnel ${this.documentData?.numero ? ': ' + this.documentData.numero : ''}`;
    }
    if (this.type === 'proforma') {
      return `Facture Proforma ${this.documentData?.numero ? ': ' + this.documentData.numero : ''}`;
    }
    return 'Visualisation Document';
  }

  imprimer(): void {
    window.print();
  }

  fermer(): void {
    window.close();
  }
}
