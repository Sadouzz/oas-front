import { Component, ChangeDetectorRef, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfBlock, PdfBlockKind, PdfTemplate, PdfTemplatePayload, PdfTemplateService } from './pdf-template.service';
import { MediaUploaderComponent } from '../../../shared/components/media-uploader/media-uploader.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-pdf-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaUploaderComponent],
  templateUrl: './pdf-templates.component.html'
})
export class PdfTemplatesComponent implements OnInit, OnDestroy {
  private readonly service = inject(PdfTemplateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);
  readonly documentTypes = [
    { id: 'FACTURE', label: 'Facture' }, { id: 'PROFORMA', label: 'Proforma' },
    { id: 'DEVIS_PREVISIONNEL', label: 'Devis prévisionnel' }, { id: 'BON_COMMANDE', label: 'Bon de commande' },
    { id: 'BON_RECEPTION', label: 'Bon de réception' }, { id: 'AVOIR_HT', label: 'Avoir HT' },
    { id: 'AVOIR_TTC', label: 'Avoir TTC' }, { id: 'DIAGNOSTIC', label: 'Diagnostic' }
  ];
  readonly tokenHelp: Record<string, string[]> = {
    FACTURE: ['numero', 'date', 'dateEcheance', 'agentNom', 'clientNom', 'immatriculation', 'marque', 'modele', 'annee', 'chassis', 'kilometrage', 'numeroBonDeCommande', 'montantHT', 'montantRemiseGenerale', 'tauxRemiseClient', 'montantRemiseClient', 'montantTVA', 'montantTimbre', 'montantAutre', 'montantTTC', 'montantTotal', 'montantPaye', 'resteAPayer', 'remarque'],
    PROFORMA: ['numero', 'clientNom', 'immatriculation', 'marque', 'modele', 'montantHT', 'tauxRemiseClient', 'montantRemiseClient', 'montantTTC', 'remarque'],
    DEVIS_PREVISIONNEL: ['numero', 'date', 'clientNom', 'immatriculation', 'marque', 'modele', 'montantTotal', 'reparations'],
    BON_COMMANDE: ['numero', 'date', 'statut', 'fournisseur', 'immatriculation', 'montantHT', 'montantTTC'],
    BON_RECEPTION: ['numero', 'date', 'statut', 'montantHT', 'montantTTC', 'remarque'],
    AVOIR_HT: ['numero', 'date', 'clientNom', 'immatriculation', 'marque', 'modele', 'montantHT', 'montantTotal', 'remarque'],
    AVOIR_TTC: ['numero', 'date', 'clientNom', 'immatriculation', 'marque', 'modele', 'montantHT', 'montantTTC', 'montantTotal', 'remarque'],
    DIAGNOSTIC: ['numero', 'date', 'statut', 'immatriculation', 'marque', 'modele', 'observations', 'pannes', 'recommandations']
  };
  readonly blockTypes: { id: PdfBlockKind; label: string }[] = [
    { id: 'heading', label: 'Titre' }, { id: 'text', label: 'Texte' }, { id: 'table', label: 'Tableau' },
    { id: 'image', label: 'Image' }, { id: 'divider', label: 'Séparateur' }
  ];
  readonly tableSources = [{ id: '', label: 'Tableau libre' }, { id: 'LIGNES_PIECES', label: 'Pièces facturées' }, { id: 'LIGNES_MAIN_DOEUVRE', label: 'Main-d’œuvre' }];
  tableFieldsFor(block: PdfBlock): string[] {
    return block.dataSource === 'LIGNES_PIECES' ? ['reference', 'designation', 'quantite', 'prixUnitaire', 'tauxRemise', 'montantBrut', 'montantRemise', 'montant']
      : block.dataSource === 'LIGNES_MAIN_DOEUVRE' ? ['designation', 'heures', 'quantite', 'prixUnitaire', 'tauxRemise', 'montantBrut', 'montantRemise', 'montant'] : [];
  }
  templates: PdfTemplate[] = [];
  selectedId: number | null = null;
  name = '';
  documentType = 'FACTURE';
  assignedDocumentTypes: string[] = ['FACTURE'];
  layoutKey = 'AVEC_ENTETE';
  active = true;
  blocks: PdfBlock[] = [];
  busy = false;
  notice = '';
  error = '';
  previewUrl: SafeResourceUrl | null = null;
  previewOpenUrl: string | null = null;
  private previewObjectUrl: string | null = null;
  previewBusy = false;

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { if (this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl); }
  load(): void {
    this.service.list().subscribe({
      next: templates => { this.templates = templates; this.cdr.markForCheck(); },
      error: () => { this.error = 'Impossible de charger les modèles.'; this.cdr.markForCheck(); }
    });
  }
  newTemplate(): void {
    this.selectedId = null; this.name = ''; this.documentType = 'FACTURE'; this.assignedDocumentTypes = ['FACTURE']; this.layoutKey = 'AVEC_ENTETE'; this.active = true;
    this.blocks = []; this.notice = ''; this.error = '';
  }
  select(template: PdfTemplate): void {
    this.selectedId = template.id; this.name = template.name; this.documentType = template.documentType;
    this.assignedDocumentTypes = [...(template.documentTypes?.length ? template.documentTypes : [template.documentType])];
    this.layoutKey = template.layoutKey === 'SANS_ENTETE' ? 'SANS_ENTETE' : 'AVEC_ENTETE';
    this.active = template.active; this.blocks = template.blocks.map(block => ({ ...block })); this.notice = ''; this.error = '';
  }
  addBlock(kind: PdfBlockKind = 'text'): void { this.blocks.push(this.createBlock(kind)); }
  removeBlock(index: number): void { this.blocks.splice(index, 1); }
  moveBlock(index: number, direction: -1 | 1): void {
    const next = index + direction;
    if (next < 0 || next >= this.blocks.length) return;
    [this.blocks[index], this.blocks[next]] = [this.blocks[next], this.blocks[index]];
  }
  private createBlock(kind: PdfBlockKind): PdfBlock {
    const tableContent = kind === 'table' ? 'Référence\tDésignation\tQté\tPrix unitaire\tRemise (%)\tTotal net\n{{reference}}\t{{designation}}\t{{quantite}}\t{{prixUnitaire}}\t{{tauxRemise}}\t{{montant}}' : '';
    return { id: crypto.randomUUID(), kind, content: kind === 'heading' ? 'Titre du document' : tableContent, align: 'left', width: '100%',
      positionMode: 'flow', offsetX: 0, offsetY: 0,
      headerRow: kind === 'table', dataSource: kind === 'table' ? 'LIGNES_PIECES' : undefined, columnWidths: kind === 'table' ? '13%,32%,8%,16%,12%,19%' : undefined };
  }
  changeTableSource(block: PdfBlock, source: string): void {
    block.dataSource = source || undefined;
    if (source === 'LIGNES_MAIN_DOEUVRE') {
      block.content = 'Désignation\tHeures\tTarif horaire\tRemise (%)\tTotal net\n{{designation}}\t{{heures}}\t{{prixUnitaire}}\t{{tauxRemise}}\t{{montant}}';
      block.columnWidths = '34%,12%,18%,13%,23%';
    } else if (source === 'LIGNES_PIECES') {
      block.content = 'Référence\tDésignation\tQté\tPrix unitaire\tRemise (%)\tTotal net\n{{reference}}\t{{designation}}\t{{quantite}}\t{{prixUnitaire}}\t{{tauxRemise}}\t{{montant}}';
      block.columnWidths = '13%,32%,8%,16%,12%,19%';
    }
  }
  isAssigned(type: string): boolean { return this.assignedDocumentTypes.includes(type); }
  toggleAllAssignments(checked: boolean): void {
    this.assignedDocumentTypes = checked ? this.documentTypes.map(type => type.id) : ['FACTURE'];
    this.documentType = 'FACTURE';
    if (!checked) return;
    this.blocks.filter(block => block.kind === 'table').forEach(block => block.dataSource = undefined);
  }
  toggleAssignment(type: string, checked: boolean): void {
    const next = new Set(this.assignedDocumentTypes);
    if (checked) next.add(type); else next.delete(type);
    if (!next.size) return;
    this.assignedDocumentTypes = [...next];
    this.documentType = next.has('FACTURE') ? 'FACTURE' : [...next][0];
    if (next.size > 1 || !next.has('FACTURE')) this.blocks.filter(block => block.kind === 'table').forEach(block => block.dataSource = undefined);
  }
  imageUploaded(block: PdfBlock, result: { secureUrl: string }): void { block.content = result.secureUrl; this.error = ''; }
  preview(): void {
    if (this.previewBusy) return;
    this.previewBusy = true;
    this.service.preview(this.payload()).subscribe({
      next: blob => {
        if (this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl);
        if (blob.size < 5 || blob.type && blob.type !== 'application/pdf') {
          this.previewUrl = null; this.previewOpenUrl = null; this.previewBusy = false;
          this.error = 'Le serveur n’a pas renvoyé un PDF valide. Vérifiez la génération du document.'; this.cdr.markForCheck(); return;
        }
        this.previewObjectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        this.previewOpenUrl = this.previewObjectUrl;
        this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewObjectUrl);
        this.previewBusy = false; this.error = ''; this.cdr.markForCheck();
      },
      error: () => { this.previewBusy = false; this.error = 'Impossible de générer l’aperçu PDF.'; this.cdr.markForCheck(); }
    });
  }
  openPreview(): void { if (this.previewOpenUrl) window.open(this.previewOpenUrl, '_blank', 'noopener'); }
  save(): void {
    if (!this.name.trim() || this.busy) { this.error = 'Indiquez un nom pour le modèle.'; return; }
    const payload = this.payload();
    this.busy = true; this.error = ''; this.notice = '';
    const request = this.selectedId ? this.service.revise(this.selectedId, payload) : this.service.create(payload);
    request.subscribe({
      next: saved => {
        this.busy = false; this.notice = `Version ${saved.version} enregistrée.`; this.select(saved); this.load(); this.cdr.markForCheck();
      },
      error: (err: any) => { this.busy = false; this.error = err.error?.message || 'Impossible d’enregistrer ce modèle.'; this.cdr.markForCheck(); }
    });
  }
  activate(template: PdfTemplate): void {
    this.service.activate(template.id).subscribe({
      next: saved => { this.notice = `${saved.name} v${saved.version} est actif pour ${this.labelOf(saved.documentType)}.`; this.load(); this.select(saved); this.cdr.markForCheck(); },
      error: (err: any) => { this.error = err.error?.message || 'Impossible d’activer ce modèle.'; this.cdr.markForCheck(); }
    });
  }
  deactivate(template: PdfTemplate): void {
    this.service.deactivate(template.id).subscribe({
      next: saved => { this.notice = `${saved.name} v${saved.version} n’est plus proposé pour les nouvelles factures.`; this.load(); this.cdr.markForCheck(); },
      error: (err: any) => { this.error = err.error?.message || 'Impossible de retirer ce modèle.'; this.cdr.markForCheck(); }
    });
  }
  labelOf(type: string): string { return this.documentTypes.find(item => item.id === type)?.label || type; }
  labelsFor(template: PdfTemplate): string { return (template.documentTypes?.length ? template.documentTypes : [template.documentType]).map(type => this.labelOf(type)).join(', '); }
  tokensForType(): string[] { return this.tokenHelp[this.documentType] || []; }
  tableSourcesForType() { return this.documentType === 'FACTURE' ? this.tableSources : [this.tableSources[0]]; }
  supportsLayout(template?: PdfTemplate): boolean {
    const types = template ? (template.documentTypes?.length ? template.documentTypes : [template.documentType]) : this.assignedDocumentTypes;
    return types.every(type => ['FACTURE', 'PROFORMA', 'DEVIS_PREVISIONNEL', 'BON_COMMANDE', 'BON_RECEPTION', 'AVOIR_HT', 'AVOIR_TTC', 'DIAGNOSTIC'].includes(type));
  }
  private payload(): PdfTemplatePayload { return { name: this.name.trim() || 'Aperçu', documentType: this.assignedDocumentTypes.includes('FACTURE') ? 'FACTURE' : this.documentType, documentTypes: [...this.assignedDocumentTypes], layoutKey: this.supportsLayout() ? this.layoutKey : 'STANDARD', active: this.active, blocks: this.blocks.map((block, index) => ({ ...block, id: block.id || `block-${index}` })) }; }
}
