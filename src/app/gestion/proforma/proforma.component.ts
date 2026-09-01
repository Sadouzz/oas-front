import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormArray, Validators, FormsModule } from '@angular/forms';
import { ProformaService } from '../../services/proforma.service';
import { AuthService } from '../auth/services/auth.service';
import { DevisPrevisionnelRequest, LignePieceRequest, LigneMainDoeuvreRequest, ProformaResponse } from '../../models/proforma.model';
import { ClientService } from '../../services/client.service';
import { VehiculeService } from '../../services/vehicule.service';

@Component({
  selector: 'app-proforma',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './proforma.component.html',
})
export class ProformaComponent implements OnInit {
  // simple incremental counter for generating line references
  private referenceCounter = 1;
  private fb = inject(FormBuilder);
  private proformaService = inject(ProformaService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private authService = inject(AuthService);

  form = this.fb.group({
    clientId: [null as number | null, Validators.required],
    vehiculeId: [null as number | null],
    lignesPieces: this.fb.array([]),
    lignesMainDoeuvre: this.fb.array([]),
    tvaApplicable: [true],
    timbre: [2000],
    observation: [''],
  });

  clients: any[] = [];
  vehicules: any[] = [];
  proformas: ProformaResponse[] = [];

  // UI state: 'list' (default), 'create', 'detail'
  viewMode: 'list' | 'create' | 'detail' = 'list';
  // filters for list
  filterNumero: string = '';
  filterImmat: string = '';
  filterClientNum: string = '';
  selectedProforma: ProformaResponse | null = null;
  errorMessage: string | null = null;

  today: Date = new Date();

  creating = false;
  lastCreated: any = null;

  ngOnInit() {
    // load vehicules in parallel
    this.vehiculeService.getAll().subscribe({ next: (d) => this.vehicules = d });
    // load clients first, then load proformas so we can enrich rows with client details
    this.clientService.getAll().subscribe({ next: (d) => { this.clients = d || []; this.loadProformas(); }, error: () => { this.clients = []; this.loadProformas(); } });
    this.addPiece();
    this.addMainDoeuvre();
  }

  loadProformas() {
    this.proformaService.getAll().subscribe({ next: (d) => {
      const list = d || [];
      // enrich each proforma so the list displays concrete values instead of '-'
      this.proformas = list.map(p => {
        const copy = { ...p } as unknown as ProformaResponse;
        if (!copy.numero) copy.numero = copy.id ? `DK-${copy.id}` : '';
        if (!copy.date) copy.date = new Date().toISOString();

        // compute montantHT from lines if missing
        if (copy.montantHT == null) {
          const pieces = copy.lignesPieces || [];
          const main = copy.lignesMainDoeuvre || [];
          const sumPieces = (pieces as any[]).reduce((s, it) => s + ((Number(it.quantite||0) * Number(it.prixUnitaire||0)) * (1 - (Number(it.remisePourcentage||0)/100))), 0);
          const sumMain = (main as any[]).reduce((s, it) => s + (Number(it.heures||0) * Number(it.prixUnitaire||0)), 0);
          copy.montantHT = Math.round(sumPieces + sumMain);
        }
        if (copy.montantTVA == null) copy.montantTVA = Math.round((Number(copy.montantHT || 0) * 0.18));
        if (copy.timbre == null) copy.timbre = copy.timbre ?? 0;
        if (copy.montantTTC == null) copy.montantTTC = Number(copy.montantHT || 0) + Number(copy.montantTVA || 0) + Number(copy.timbre || 0);

        // try to enrich client fields from cached clients
        if ((!copy.clientNom || !copy.clientTelephone || !copy.clientEmail) && this.clients && this.clients.length) {
          const c = this.clients.find(x => Number(x.id) === Number(copy.clientId));
          if (c) {
            copy.clientNom = copy.clientNom || ((c.firstName ? (c.firstName + (c.lastName ? ' ' + c.lastName : '')) : c.username) as any);
            copy.clientTelephone = copy.clientTelephone || c.phone || null;
            copy.clientEmail = copy.clientEmail || c.email || null;
          }
        }

        return copy;
      });
      // For any proforma still missing client display fields, try to fetch the client individually
      this.proformas.forEach(p => {
        if (p && (!p.clientNom || !p.clientTelephone || !p.clientEmail)) {
          this.clientService.getById(Number(p.clientId)).subscribe({ next: (c) => {
            p.clientNom = p.clientNom || ((c.firstName ? (c.firstName + (c.lastName ? ' ' + c.lastName : '')) : c.username) as any);
            p.clientTelephone = p.clientTelephone || c.phone || null;
            p.clientEmail = p.clientEmail || c.email || null;
          }, error: () => { /* ignore errors */ } });
        }
      });
    } });
  }

  get username(): string { return this.authService.getUsername() ?? 'Agent'; }

  get filteredProformas(): ProformaResponse[] {
    return this.proformas.filter(p => {
      const matchesNumero = !this.filterNumero || (p.numero || '').toString().toLowerCase().includes(this.filterNumero.toLowerCase());
      const imm = p.vehicule?.immatriculation || '';
      const matchesImmat = !this.filterImmat || imm.toLowerCase().includes(this.filterImmat.toLowerCase());
      const matchesClient = !this.filterClientNum || (p.clientId && p.clientId.toString().includes(this.filterClientNum));
      return matchesNumero && matchesImmat && matchesClient;
    });
  }

  openCreate() {
    this.viewMode = 'create';
    this.selectedProforma = null;
    // restart local reference sequence for a new form
    this.referenceCounter = 1;
    this.form.reset({ clientId: null, vehiculeId: null, lignesPieces: [], lignesMainDoeuvre: [], tvaApplicable: true, timbre: 2000, observation: '' });
    // ensure at least one line exists
    while (this.lignesPieces.length) this.lignesPieces.removeAt(0);
    while (this.lignesMainDoeuvre.length) this.lignesMainDoeuvre.removeAt(0);
    this.addPiece();
    this.addMainDoeuvre();
  }

  openDetail(p: ProformaResponse) {
    this.selectedProforma = p;
    this.lastCreated = p;
    this.viewMode = 'detail';
    // Ensure client info is fresh: try to fetch client details if missing
    if (p && (!p.clientNom || !p.clientTelephone || !p.clientEmail)) {
      try {
        this.clientService.getById(Number(p.clientId)).subscribe({ next: (c) => {
          if (!this.selectedProforma) return;
          this.selectedProforma.clientNom = this.selectedProforma.clientNom || ((c.firstName ? (c.firstName + (c.lastName ? ' ' + c.lastName : '')) : c.username) as any);
          this.selectedProforma.clientTelephone = this.selectedProforma.clientTelephone || c.phone || null;
          this.selectedProforma.clientEmail = this.selectedProforma.clientEmail || c.email || null;
        }, error: () => { /* ignore */ } });
      } catch (e) { /* ignore */ }
    }
  }

  // Helpers to provide detail data (prefer selectedProforma, then lastCreated, then form)
  detailLignesPieces() {
    return this.selectedProforma?.lignesPieces && this.selectedProforma.lignesPieces.length ? this.selectedProforma.lignesPieces : (this.lastCreated?.lignesPieces && this.lastCreated.lignesPieces.length ? this.lastCreated.lignesPieces : (this.form.value.lignesPieces || []));
  }

  detailLignesMainDoeuvre() {
    return this.selectedProforma?.lignesMainDoeuvre && this.selectedProforma.lignesMainDoeuvre.length ? this.selectedProforma.lignesMainDoeuvre : (this.lastCreated?.lignesMainDoeuvre && this.lastCreated.lignesMainDoeuvre.length ? this.lastCreated.lignesMainDoeuvre : (this.form.value.lignesMainDoeuvre || []));
  }

  detailVehicule() {
    return this.selectedProforma?.vehicule || this.lastCreated?.vehicule || this.vehicules.find(v => Number(v.id) === Number(this.form.get('vehiculeId')!.value)) || null;
  }

  detailClientField(field: keyof ProformaResponse) {
    if (!this.selectedProforma && !this.lastCreated) return null;
    return (this.selectedProforma && (this.selectedProforma as any)[field]) ?? (this.lastCreated && (this.lastCreated as any)[field]) ?? null;
  }

  getProformaNumber() {
    const id = this.selectedProforma?.id ?? this.lastCreated?.id;
    if (id) return `DK-${id}`;
    // fallback temporary number with year
    const y = this.today.getFullYear();
    return `DK-${y}-TMP`;
  }

  clientDisplayNameById(id?: number | null): string | null {
    if (!id) return null;
    const c = this.clients.find(x => Number(x.id) === Number(id));
    if (!c) return null;
    return (c.firstName || c.username ? ((c.firstName ? (c.firstName + (c.lastName ? ' ' + c.lastName : '')) : c.username)) : null) as string;
  }

  clientPhoneById(id?: number | null): string | null {
    if (!id) return null;
    const c = this.clients.find(x => Number(x.id) === Number(id));
    return c ? c.phone || null : null;
  }

  clientEmailById(id?: number | null): string | null {
    if (!id) return null;
    const c = this.clients.find(x => Number(x.id) === Number(id));
    return c ? c.email || null : null;
  }

  // Helpers for list display with sensible fallbacks
  getRowNumero(p: ProformaResponse): string {
    return p.numero || (p.id ? `DK-${p.id}` : '-');
  }

  getRowDate(p: ProformaResponse): string {
    if (p.date) return new Date(p.date).toLocaleString();
    return '-';
  }

  getRowMontantHT(p: ProformaResponse): string {
    if (p.montantHT != null) return this.formatNumber(p.montantHT);
    // try to compute from lines if available
    if (p.lignesPieces || p.lignesMainDoeuvre) {
      const pieces = p.lignesPieces || [];
      const main = p.lignesMainDoeuvre || [];
      const sumPieces = (pieces as any[]).reduce((s, it) => s + ((Number(it.quantite||0) * Number(it.prixUnitaire||0)) * (1 - (Number(it.remisePourcentage||0)/100))), 0);
      const sumMain = (main as any[]).reduce((s, it) => s + (Number(it.heures||0) * Number(it.prixUnitaire||0)), 0);
      return this.formatNumber(sumPieces + sumMain);
    }
    return '-';
  }

  getRowMontantTTC(p: ProformaResponse): string {
    if (p.montantTTC != null) return this.formatNumber(p.montantTTC);
    if (p.montantHT != null) {
      const tva = p.montantTVA != null ? Number(p.montantTVA) : Math.round(Number(p.montantHT) * 0.18);
      const tim = p.timbre != null ? Number(p.timbre) : 0;
      return this.formatNumber(Number(p.montantHT) + tva + tim);
    }
    // fallback to compute
    const ht = this.getRowMontantHT(p);
    if (ht !== '-') return this.formatNumber(Number(ht));
    return '-';
  }

  // Resolve client info for a given proforma (fallback to cached clients)
  clientNameFor(p?: ProformaResponse | null): string | null {
    if (!p) return null;
    if (p.clientNom) return p.clientNom;
    return this.clientDisplayNameById(p.clientId) || null;
  }

  clientPhoneFor(p?: ProformaResponse | null): string | null {
    if (!p) return null;
    if (p.clientTelephone) return p.clientTelephone;
    return this.clientPhoneById(p.clientId) || null;
  }

  clientEmailFor(p?: ProformaResponse | null): string | null {
    if (!p) return null;
    if (p.clientEmail) return p.clientEmail;
    return this.clientEmailById(p.clientId) || null;
  }

  // Build a printable HTML view using the proforma data and open in a new window
  previewWithLogo(p: ProformaResponse) {
    const data = p || this.lastCreated;
    if (!data) return;
  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Proforma ${data.id || ''}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: Arial, Helvetica, sans-serif; margin:0; padding:0; }
    .sheet { padding:20px; position: relative; min-height: 1122px; }
  .watermark { position: absolute; inset:0; background-image: url('/assets/oas-logo.svg'); background-repeat: no-repeat; background-position: center center; background-size: 40%; opacity: 0.08; z-index: 0; }
    .content { position: relative; z-index: 1; }
    table { width:100%; border-collapse: collapse; }
    td, th { padding:6px; border: 1px solid #ddd; }
    .right { text-align:right; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="watermark"></div>
      <div class="content">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div><img src="/assets/oas-logo.svg" alt="OAS" style="height:48px;"/></div>
        <div style="text-align:right;"><h2 style="margin:0;">PROFORMA ${this.getRowNumero(data)}</h2><div>${new Date(data.date || '').toLocaleString()}</div></div>
      </div>
      <p><strong>Client:</strong> ${data.clientNom || data.clientId || ''}</p>
      <p><strong>Véhicule:</strong> ${data.vehicule?.immatriculation || ''} - ${data.vehicule?.marque || ''} ${data.vehicule?.modele || ''}</p>
      <h3>Lignes pièces</h3>
      <table>
        <thead><tr><th>Réf</th><th>Désignation</th><th>Qté</th><th>PU</th><th>Total</th></tr></thead>
        <tbody>
          ${(data.lignesPieces || []).map((it: any) => `<tr><td>${it.reference||''}</td><td>${it.designation||''}</td><td class='right'>${it.quantite||0}</td><td class='right'>${this.formatNumber(it.prixUnitaire||0)}</td><td class='right'>${this.formatNumber(((it.quantite||0)*(it.prixUnitaire||0)*(1 - ((it.remisePourcentage||0)/100))))}</td></tr>`).join('')}
        </tbody>
      </table>

      <h3>Mains d'oeuvre</h3>
      <table>
        <thead><tr><th>Réf</th><th>Désignation</th><th>Hrs</th><th>PU</th><th>Total</th></tr></thead>
        <tbody>
          ${(data.lignesMainDoeuvre || []).map((it: any) => `<tr><td>${it.reference||''}</td><td>${it.designation||''}</td><td class='right'>${it.heures||0}</td><td class='right'>${this.formatNumber(it.prixUnitaire||0)}</td><td class='right'>${this.formatNumber(((it.heures||0)*(it.prixUnitaire||0)))}</td></tr>`).join('')}
        </tbody>
      </table>

      <div style='margin-top:20px; text-align:right;'>
        <p><strong>Total HT:</strong> ${this.getRowMontantHT(data)}</p>
        <p><strong>TVA:</strong> ${data.montantTVA != null ? this.formatNumber(data.montantTVA) : this.formatNumber(Math.round((Number(data.montantHT||0) * 0.18)) )}</p>
        <p><strong>Timbre:</strong> ${data.timbre != null ? this.formatNumber(data.timbre) : this.formatNumber(0)}</p>
        <p style='font-size:18px;'><strong>Total TTC:</strong> ${this.getRowMontantTTC(data)}</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

    const w = window.open('', '_blank');
    if (!w) { alert('Impossible d' + "'" + 'ouvrir la fenêtre d' + "'" + 'aperçu. Autorisez les popups.'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  montantHTDetail(): number {
    const pieces = this.detailLignesPieces() || [];
    const main = this.detailLignesMainDoeuvre() || [];
    const sumPieces = pieces.reduce((s: number, p: any) => {
      const q = Number(p.quantite || 0);
      const pu = Number(p.prixUnitaire || 0);
      const r = Number(p.remisePourcentage || 0);
      return s + q * pu * (1 - (r / 100));
    }, 0);
    const sumMain = main.reduce((s: number, m: any) => s + (Number(m.heures || 0) * Number(m.prixUnitaire || 0)), 0);
    return sumPieces + sumMain;
  }

  montantTVADetail(): number { return Number((this.montantHTDetail() * 0.18).toFixed(0)); }
  timbreDetail(): number { return Number(this.form.get('timbre')!.value || 0); }
  montantTTCDDetail(): number { return this.montantHTDetail() + this.montantTVADetail() + this.timbreDetail(); }

  cancelCreate() { this.viewMode = 'list'; }

  get lignesPieces(): FormArray { return this.form.get('lignesPieces') as FormArray; }
  get lignesMainDoeuvre(): FormArray { return this.form.get('lignesMainDoeuvre') as FormArray; }

  addPiece() { this.lignesPieces.push(this.fb.group({ reference: [this.generateReference('P')], designation: [null], quantite: [1, [Validators.required, Validators.min(1)]], remisePourcentage: [0], prixUnitaire: [0, [Validators.required, Validators.min(0)]] })); }
  removePiece(i: number) { if (this.lignesPieces.length > 1) this.lignesPieces.removeAt(i); }
  addMainDoeuvre() { this.lignesMainDoeuvre.push(this.fb.group({ reference: [this.generateReference('M')], designation: [null], heures: [0, [Validators.required, Validators.min(0)]], prixUnitaire: [0, [Validators.required, Validators.min(0)]] })); }
  removeMainDoeuvre(i: number) { if (this.lignesMainDoeuvre.length > 1) this.lignesMainDoeuvre.removeAt(i); }

  // Generate a short, human readable reference for lines
  generateReference(prefix: string = 'REF'): string {
    const seq = String(this.referenceCounter++).padStart(3, '0');
    const year = this.today.getFullYear().toString().slice(-2);
    return `${prefix}-${year}-${seq}`;
  }

  // Delete a proforma from the list (confirm then call backend)
  deleteProforma(id?: number) {
    if (!id) return;
    if (!confirm('Confirmer la suppression de cette proforma ?')) return;
    this.proformaService.delete(id).subscribe({ next: () => {
      // refresh list and leave detail view if needed
      if (this.selectedProforma && this.selectedProforma.id === id) { this.selectedProforma = null; this.viewMode = 'list'; }
      this.loadProformas();
    }, error: (err) => {
      console.error('Failed to delete proforma', err);
      this.errorMessage = "Impossible de supprimer la proforma.";
    } });
  }

  // Ensure a consistent dot decimal separator and no locale-specific commas
  formatNumber(value: number | null | undefined): string {
    const v = Number(value || 0);
    // no decimals shown for CFA amounts in this UI (match previous behavior)
    return v.toFixed(0);
  }

  montantLignesPieces(): number {
    return this.lignesPieces.controls.reduce((s, c: any) => {
      const q = Number(c.get('quantite')!.value || 0);
      const pu = Number(c.get('prixUnitaire')!.value || 0);
      const r = Number(c.get('remisePourcentage')!.value || 0);
      const total = q * pu * (1 - (r / 100));
      return s + total;
    }, 0);
  }

  montantLignesMainDoeuvre(): number {
    return this.lignesMainDoeuvre.controls.reduce((s, c: any) => {
      const h = Number(c.get('heures')!.value || 0);
      const pu = Number(c.get('prixUnitaire')!.value || 0);
      return s + (h * pu);
    }, 0);
  }

  montantHT(): number { return this.montantLignesPieces() + this.montantLignesMainDoeuvre(); }
  montantTVA(): number { return this.form.get('tvaApplicable')!.value ? Number((this.montantHT() * 0.18).toFixed(0)) : 0; }
  timbre(): number { return Number(this.form.get('timbre')!.value || 0); }
  montantTTC(): number { return this.montantHT() + this.montantTVA() + this.timbre(); }

  submit() {
    if (this.form.invalid || this.creating) { this.form.markAllAsTouched(); return; }
    this.creating = true;
    const fv = this.form.value;

    // try to get kilometrage from selected vehicule if available
    const selectedVehicule = (fv.vehiculeId != null) ? this.vehicules.find(v => Number(v.id) === Number(fv.vehiculeId)) : null;
    const kilometrage = selectedVehicule && selectedVehicule.kilometrage ? Number(selectedVehicule.kilometrage) : undefined;

    // map lignesPieces form array to request shape
    const lignesPiecesReq: LignePieceRequest[] = this.lignesPieces.controls.map((c: any) => ({
      reference: c.get('reference')!.value || null,
      designation: c.get('designation')!.value || null,
      quantite: Number(c.get('quantite')!.value || 0),
      remisePourcentage: c.get('remisePourcentage')!.value != null ? Number(c.get('remisePourcentage')!.value) : 0,
      prixUnitaire: Number(c.get('prixUnitaire')!.value || 0),
    }));

    const lignesMainDoeuvreReq: LigneMainDoeuvreRequest[] = this.lignesMainDoeuvre.controls.map((c: any) => ({
      reference: c.get('reference')!.value || null,
      designation: c.get('designation')!.value || null,
      heures: Number(c.get('heures')!.value || 0),
      prixUnitaire: Number(c.get('prixUnitaire')!.value || 0),
    }));

    const payload: DevisPrevisionnelRequest = {
      notesReparation: fv.observation || null,
      montantTotal: Number(this.montantTTC()),
      kilometrageVehicule: kilometrage,
      vehiculeId: fv.vehiculeId ? Number(fv.vehiculeId) : undefined,
      clientId: Number(fv.clientId),
      // include detailed lines so front-end can persist/display them
      lignesPieces: lignesPiecesReq,
      lignesMainDoeuvre: lignesMainDoeuvreReq,
    };

    console.log('Sending proforma payload', payload);
    this.errorMessage = null;
    this.proformaService.create(payload as any).subscribe({ next: (r: any) => { this.lastCreated = r; this.creating = false; this.loadProformas(); this.openDetail(r as unknown as ProformaResponse); }, error: (err) => {
      this.creating = false;
      console.error('Failed to create proforma', err);
      if (err && err.status === 409) {
        this.errorMessage = 'Conflit: Une proforma similaire existe déjà (409). Vérifiez les données.';
      } else {
        this.errorMessage = 'Erreur lors de la création du proforma.';
      }
    } });
  }

  downloadPdf(id?: number) {
    if (!id) return;
    this.errorMessage = null;
  this.proformaService.downloadPdf(id).subscribe({ next: (b) => {
      try {
        // ensure we have a Blob
        const blob = b instanceof Blob ? b : new Blob([b], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proforma-${id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Failed to download PDF', e, b);
        this.errorMessage = 'Impossible de télécharger le PDF.';
      }
    }, error: (err) => {
      console.error('PDF download failed', err);
      if (err && err.status === 403) {
        this.errorMessage = 'Accès refusé (403) au PDF. Vérifiez vos permissions / token et les en-têtes CORS sur le serveur.';
      } else {
        this.errorMessage = 'Erreur lors du téléchargement du PDF.';
      }
    } });
  }

  // Convert number to French words (simple implementation for CFA amounts)
  numberToWords(n: number): string {
    if (n === 0) return 'zéro franc CFA';
    const units = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize'];
    const tens = ['','','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];

    function underThousand(num: number): string {
      let words = '';
      const hundreds = Math.floor(num / 100);
      const rest = num % 100;
      if (hundreds > 0) {
        words += (hundreds > 1 ? units[hundreds] + ' ' : '') + 'cent' + (rest === 0 && hundreds > 1 ? 's' : '');
        if (rest) words += ' ';
      }
      if (rest < 17) { words += units[rest]; }
      else if (rest < 20) { words += 'dix-' + units[rest - 10]; }
      else if (rest < 70) {
        const t = Math.floor(rest / 10);
        const u = rest % 10;
        words += tens[t] + (u === 1 && (t === 1 || t === 7 || t === 9) ? ' et un' : (u ? (u === 1 ? '-et-un' : '-' + units[u]) : ''));
      } else if (rest < 80) { // 70..79
        const u = rest - 60;
        words += 'soixante' + (u === 11 ? '-onze' : (u ? '-' + units[u] : '')); 
      } else { // 80..99
        const u = rest - 80;
        words += 'quatre-vingt' + (u ? '-' + units[u] : 's');
      }
      return words.trim();
    }

    const parts: string[] = [];
    const milliards = Math.floor(n / 1_000_000_000);
    const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
    const milliers = Math.floor((n % 1_000_000) / 1000);
    const reste = n % 1000;

    if (milliards) parts.push(underThousand(milliards) + ' milliard' + (milliards > 1 ? 's' : ''));
    if (millions) parts.push(underThousand(millions) + ' million' + (millions > 1 ? 's' : ''));
    if (milliers) parts.push((milliers === 1 ? 'mille' : underThousand(milliers) + ' mille'));
    if (reste) parts.push(underThousand(reste));

    return parts.join(' ').replace(/\s+/g,' ').trim() + ' francs CFA';
  }
}
