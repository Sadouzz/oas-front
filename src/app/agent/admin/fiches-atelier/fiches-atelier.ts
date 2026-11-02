import { Component, inject, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FicheAtelierService } from '../../fiches-atelier/fiche-atelier.service';
import { AgentSignatureService } from '../../fiches-atelier/agent-signature.service';
import { FicheAtelierConfigService } from '../../fiches-atelier/fiche-atelier-config.service';
import { RendezVousService } from '../../rendezvous/rendezvous.service';
import { ClientService } from '../../clients/client.service';
import { VehiculeService } from '../../vehicules/vehicule.service';
import {
  RendezVous,
  FicheAtelierRequest,
  ClientListResponse,
  VehiculeModel,
  extractContent,
  DEFAULT_LIGNES_RECEPTION,
  DEFAULT_RUBRIQUES_DEFAUTS,
  parseFicheAtelierConfig
} from '../../../shared/models';
import { LucidePlus, LucideTrash2, LucideArrowLeft, LucideSave, LucideX } from '@lucide/angular';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { PhoneInputComponent } from '../../../shared/components/phone-input/phone-input.component';

const RUBRIQUES_EXCLUES_FICHE_ATELIER = new Set(['peinture', 'tolerie']);
const RUBRIQUES_AJOUTEES_FICHE_ATELIER = ['Carrosserie', 'Pneumatique', 'Vitrage', 'Lavage'];

function normaliserRubrique(nom: string): string {
  return nom.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
}

function preparerRubriquesFicheAtelier(rubriques: string[]): string[] {
  const dejaAjoutees = new Set<string>();
  return [...rubriques, ...RUBRIQUES_AJOUTEES_FICHE_ATELIER].filter(nom => {
    const normalisee = normaliserRubrique(nom);
    if (!normalisee || RUBRIQUES_EXCLUES_FICHE_ATELIER.has(normalisee) || dejaAjoutees.has(normalisee)) {
      return false;
    }
    dejaAjoutees.add(normalisee);
    return true;
  });
}

@Component({
  selector: 'app-fiches-atelier',
  standalone: true,
  imports: [ReactiveFormsModule, LucidePlus, LucideTrash2, LucideArrowLeft, LucideSave, LucideX, SearchableSelectComponent, PhoneInputComponent, DatePipe],
  templateUrl: './fiches-atelier.html',
  styleUrl: './fiches-atelier.css',
})
export class FichesAtelier implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(FicheAtelierService);
  private agentSignatureService = inject(AgentSignatureService);
  private configService = inject(FicheAtelierConfigService);
  private rdvService = inject(RendezVousService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);

  form!: FormGroup;
  rendezVousId: number | null = null;
  rdvData: RendezVous | null = null;
  clients: ClientListResponse[] = [];
  clientVehicules: VehiculeModel[] = [];
  loadingVehicules = false;
  loading = false;
  saving = false;
  error = '';
  success = '';
  showConditionsModal = false;
  conditionsAcceptees = false;
  signatureClientBase64 = '';
  signatureAgentConfiguree = false;
  signatureAgentBase64 = '';
  showSaveAgentSignatureModal = false;
  private signatureSavePromptHandled = false;

  @ViewChild('signatureReceptionnaireCanvas') set sigRecCanvas(el: ElementRef<HTMLCanvasElement>) {
    if (el) {
      this.sigRecEl = el;
      this.ctxRec = el.nativeElement.getContext('2d');
      if (this.ctxRec) {
        this.ctxRec.lineWidth = 2;
        this.ctxRec.lineCap = 'round';
        this.ctxRec.strokeStyle = '#000000';
      }
    }
  }
  @ViewChild('signatureClientCanvas') set sigClientCanvas(el: ElementRef<HTMLCanvasElement>) {
    if (el) {
      this.sigClientEl = el;
      this.ctxClient = el.nativeElement.getContext('2d');
      if (this.ctxClient) {
        this.ctxClient.lineWidth = 2;
        this.ctxClient.lineCap = 'round';
        this.ctxClient.strokeStyle = '#000000';
      }
    }
  }
  
  sigRecEl!: ElementRef<HTMLCanvasElement>;
  sigClientEl!: ElementRef<HTMLCanvasElement>;
  
  private ctxRec: CanvasRenderingContext2D | null = null;
  private ctxClient: CanvasRenderingContext2D | null = null;
  
  private isDrawingRec = false;
  private isDrawingClient = false;
  private signatureRecDessinee = false;
  signatureClientDessinee = false;

  defaultReception: string[] = [...DEFAULT_LIGNES_RECEPTION];
  defaultDefauts: string[] = preparerRubriquesFicheAtelier(DEFAULT_RUBRIQUES_DEFAUTS);

  ngOnInit(): void {
    this.agentSignatureService.getMine().subscribe({
      next: signature => {
        this.signatureAgentConfiguree = signature.configured;
        this.signatureAgentBase64 = signature.signatureBase64 || '';
        this.cdr.markForCheck();
      },
      error: () => { /* Le dessin manuel reste disponible si aucune signature n'est accessible. */ }
    });
    const rdvIdParam = this.route.snapshot.paramMap.get('rendezVousId');
    if (rdvIdParam) {
      this.rendezVousId = +rdvIdParam;
      this.loadRendezVousData();
    } else {
      this.rendezVousId = null;
      this.loadClients();
    }

    this.initForm();
    this.loadConfigAndLines();
  }

  isRdvTodayOrPast(dateStr?: string | null): boolean {
    if (!dateStr) return true;
    const rdv = new Date(dateStr);
    const now = new Date();
    const rdvMidnight = new Date(rdv.getFullYear(), rdv.getMonth(), rdv.getDate()).getTime();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return todayMidnight >= rdvMidnight;
  }

  initForm() {
    this.form = this.fb.group({
      clientId: [null, this.rendezVousId ? [] : [Validators.required]],
      vehiculeId: [null, this.rendezVousId ? [] : [Validators.required]],
      nomChauffeur: ['', Validators.required],
      telephoneChauffeur: [''],
      kilometrage: [null, [Validators.required, Validators.min(0)]],
      niveauEssence: [''],
      designationTravaux: ['', Validators.required],
      nb: [''],
      lignesReception: this.fb.array([]),
      lignesDefauts: this.fb.array([])
    });

    this.populateDefaultLines();
  }

  loadConfigAndLines() {
    this.configService.getAll().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          const cfg = parseFicheAtelierConfig(data[0].configJson);
          if (cfg.lignesReception && cfg.lignesReception.length > 0) {
            const activeReception = cfg.lignesReception
              .filter(item => !item.archive)
              .map(item => item.nom.trim())
              .filter(Boolean);
            const anciennesRubriquesRemplacees = new Set([
              'carrosserie',
              'intérieur / habitacle',
              'vitrage / pare-brise',
              'eclairage',
              'accessoires (cric, roue de secours...)'
            ]);
            const rubriquesReference = new Set(
              DEFAULT_LIGNES_RECEPTION.map(nom => nom.toLocaleLowerCase('fr'))
            );
            const rubriquesManuelles = new Map<string, string>();
            for (const nom of activeReception) {
              const cle = nom.toLocaleLowerCase('fr');
              if (!rubriquesReference.has(cle) && !anciennesRubriquesRemplacees.has(cle)) {
                rubriquesManuelles.set(cle, nom);
              }
            }
            // Remplacer les anciennes rubriques par la liste de référence et
            // conserver seulement les lignes personnalisées actives du garage.
            this.defaultReception = [
              ...DEFAULT_LIGNES_RECEPTION,
              ...rubriquesManuelles.values()
            ];
          }
          if (cfg.rubriquesDefauts && cfg.rubriquesDefauts.length > 0) {
            const rubriquesConfigurees = cfg.rubriquesDefauts
              .filter(item => !item.archive
                && !RUBRIQUES_EXCLUES_FICHE_ATELIER.has(normaliserRubrique(item.nom)))
              .map(item => item.nom);
            this.defaultDefauts = preparerRubriquesFicheAtelier(rubriquesConfigurees);
          }
          this.populateDefaultLines();
          this.cdr.markForCheck();
        }
      },
      error: () => {
        // En cas d'erreur de chargement, les lignes par défaut sont déjà présentes
      }
    });
  }

  populateDefaultLines() {
    const existingReceptionMap = new Map<string, any>();
    this.lignesReception.controls.forEach(ctrl => {
      const val = ctrl.value;
      if (val && val.nom) {
        existingReceptionMap.set(val.nom.trim().toLowerCase(), val);
      }
    });

    const existingDefautsMap = new Map<string, any>();
    this.lignesDefauts.controls.forEach(ctrl => {
      const val = ctrl.value;
      if (val && val.nom) {
        existingDefautsMap.set(val.nom.trim().toLowerCase(), val);
      }
    });

    while (this.lignesReception.length > 0) {
      this.lignesReception.removeAt(0);
    }
    while (this.lignesDefauts.length > 0) {
      this.lignesDefauts.removeAt(0);
    }

    this.defaultReception.forEach(r => {
      const existing = existingReceptionMap.get(r.trim().toLowerCase());
      this.addReception(r, existing ? existing.etat : null);
    });

    this.defaultDefauts.forEach(d => {
      const existing = existingDefautsMap.get(d.trim().toLowerCase());
      this.addDefaut(
        d,
        existing ? existing.present : false,
        existing ? existing.designation : ''
      );
    });
  }

  formatClient = (c: ClientListResponse): string => {
    if (!c) return '';
    const name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
    const contact = c.phone || c.email || '';
    return contact ? `${name} (${contact})` : name;
  };

  formatVehicule = (v: VehiculeModel): string => {
    if (!v) return '';
    const immat = v.immatriculation || '';
    const details = `${v.marque || ''} ${v.modele || ''}`.trim();
    return details ? `${immat} — ${details}` : immat;
  };

  loadingClients = false;
  private clientSearchDebounce: any;

  loadClients(keyword: string = '') {
    this.loadingClients = true;
    const params: any = { page: 0, size: 10 };
    if (keyword && keyword.trim()) {
      params.keyword = keyword.trim();
    }
    this.clientService.getAll(params).subscribe({
      next: (data) => {
        this.clients = extractContent(data);
        this.loadingClients = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.clients = [];
        this.loadingClients = false;
        this.cdr.markForCheck();
      }
    });
  }

  onClientSearch(term: string) {
    clearTimeout(this.clientSearchDebounce);
    this.clientSearchDebounce = setTimeout(() => {
      this.loadClients(term);
    }, 300);
  }

  onClientChange(val: any) {
    const clientId = typeof val === 'object' && val !== null && 'target' in val
      ? (val.target as HTMLSelectElement).value ? +((val.target as HTMLSelectElement).value) : null
      : (val ? +val : null);

    this.form.patchValue({ clientId: clientId, vehiculeId: null });
    this.clientVehicules = [];

    if (clientId) {
      this.loadingVehicules = true;
      this.vehiculeService.getByClient(clientId).subscribe({
        next: (data) => {
          this.clientVehicules = extractContent<VehiculeModel>(data);
          if (this.clientVehicules.length === 1) {
            this.form.patchValue({ vehiculeId: this.clientVehicules[0].id });
          }
          this.loadingVehicules = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.clientVehicules = [];
          this.loadingVehicules = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  get lignesReception() {
    return this.form.get('lignesReception') as FormArray;
  }

  get lignesDefauts() {
    return this.form.get('lignesDefauts') as FormArray;
  }

  addReception(nom: string = '', etat: boolean | null = null) {
    this.lignesReception.push(this.fb.group({
      nom: [nom, Validators.required],
      etat: [etat] // true = OUI, false = NON, null = non renseigné
    }));
  }

  setReceptionEtat(index: number, val: boolean) {
    const ctrl = this.lignesReception.at(index)?.get('etat');
    if (ctrl) {
      const current = ctrl.value;
      ctrl.setValue(current === val ? null : val);
      ctrl.markAsDirty();
      ctrl.markAsTouched();
      this.cdr.markForCheck();
    }
  }

  removeReception(index: number) {
    this.lignesReception.removeAt(index);
  }

  addDefaut(nom: string = '', present: boolean = false, designation: string = '') {
    this.lignesDefauts.push(this.fb.group({
      nom: [nom, Validators.required],
      present: [present],
      designation: [designation]
    }));
  }

  toggleDefautPresent(index: number) {
    const ctrl = this.lignesDefauts.at(index)?.get('present');
    if (ctrl) {
      ctrl.setValue(!ctrl.value);
      ctrl.markAsDirty();
      ctrl.markAsTouched();
      this.cdr.markForCheck();
    }
  }

  onDefautDesignationInput(index: number, value: string) {
    const group = this.lignesDefauts.at(index);
    if (group) {
      group.get('designation')?.setValue(value, { emitEvent: false });
      if (value && value.trim().length > 0) {
        group.get('present')?.setValue(true, { emitEvent: false });
      }
      this.cdr.markForCheck();
    }
  }

  removeDefaut(index: number) {
    this.lignesDefauts.removeAt(index);
  }

  loadRendezVousData() {
    this.loading = true;
    this.rdvService.getById(this.rendezVousId!).subscribe({
      next: (rdv) => {
        this.rdvData = rdv || null;
        if (!this.rdvData) {
          this.error = "Rendez-vous introuvable.";
        } else if (!this.isRdvTodayOrPast(this.rdvData.dateRendezVous)) {
          const rdvDateStr = new Date(this.rdvData.dateRendezVous).toLocaleDateString('fr-FR');
          this.error = `Impossible de générer la fiche atelier avant le jour du rendez-vous (prévu le ${rdvDateStr}).`;
          this.form.disable();
        } else {
          this.form.patchValue({
            clientId: this.rdvData.clientId,
            vehiculeId: this.rdvData.vehiculeId,
            designationTravaux: this.rdvData.motif
          });
        }
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => {
        this.error = "Erreur lors du chargement du rendez-vous.";
        this.loading = false; this.cdr.markForCheck();
      }
    });
  }

  startDrawing(event: MouseEvent | TouchEvent, type: 'rec' | 'client') {
    if (type === 'client' && !this.conditionsAcceptees) return;
    if (type === 'rec') this.isDrawingRec = true;
    if (type === 'client') this.isDrawingClient = true;
    this.draw(event, type);
  }

  draw(event: MouseEvent | TouchEvent, type: 'rec' | 'client') {
    const isDrawing = type === 'rec' ? this.isDrawingRec : this.isDrawingClient;
    const ctx = type === 'rec' ? this.ctxRec : this.ctxClient;
    const canvas = type === 'rec' ? this.sigRecEl?.nativeElement : this.sigClientEl?.nativeElement;
    
    if (!isDrawing || !ctx || !canvas) return;
    event.preventDefault();

    const rect = canvas.getBoundingClientRect();
    let clientX: number | undefined, clientY: number | undefined;
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else if (event instanceof TouchEvent) {
      const touch = event.touches[0] || event.changedTouches[0];
      if (touch) { clientX = touch.clientX; clientY = touch.clientY; }
    }

    if (clientX !== undefined && clientY !== undefined && rect.width > 0 && rect.height > 0) {
      const x = (clientX - rect.left) * canvas.width / rect.width;
      const y = (clientY - rect.top) * canvas.height / rect.height;
      ctx.lineTo(x, y);
      ctx.stroke();
      if (type === 'rec') this.signatureRecDessinee = true;
      else this.signatureClientDessinee = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }

  stopDrawing(type: 'rec' | 'client') {
    if (type === 'rec') {
      this.isDrawingRec = false;
      if (this.ctxRec) this.ctxRec.beginPath();
    } else {
      this.isDrawingClient = false;
      if (this.ctxClient) this.ctxClient.beginPath();
    }
  }

  clearSignature(type: 'rec' | 'client') {
    if (type === 'rec') this.signatureRecDessinee = false;
    else this.signatureClientDessinee = false;
    const ctx = type === 'rec' ? this.ctxRec : this.ctxClient;
    const canvas = type === 'rec' ? this.sigRecEl?.nativeElement : this.sigClientEl?.nativeElement;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  accepterConditions() {
    this.conditionsAcceptees = true;
  }

  onConditionsChoice(event: Event): void {
    const accepted = (event.target as HTMLInputElement).checked;
    if (accepted) {
      this.accepterConditions();
      return;
    }
    this.conditionsAcceptees = false;
    this.signatureClientDessinee = false;
    this.signatureClientBase64 = '';
    this.clearSignature('client');
  }

  validerSignatureClient(): void {
    if (!this.conditionsAcceptees || !this.signatureClientDessinee || !this.sigClientEl?.nativeElement) return;
    this.signatureClientBase64 = this.sigClientEl.nativeElement.toDataURL('image/png');
    this.showConditionsModal = false;
    this.cdr.markForCheck();
  }

  fermerModalConditions(): void {
    if (!this.signatureClientBase64) {
      this.signatureClientDessinee = false;
      this.clearSignature('client');
    }
    this.showConditionsModal = false;
  }

  refaireSignatureClient(): void {
    this.signatureClientBase64 = '';
    this.signatureClientDessinee = false;
    this.showConditionsModal = true;
    setTimeout(() => this.clearSignature('client'));
  }

  appliquerMaSignature(): void {
    if (!this.signatureAgentBase64 || !this.sigRecEl?.nativeElement || !this.ctxRec) return;
    const image = new Image();
    image.onload = () => {
      const canvas = this.sigRecEl.nativeElement;
      this.ctxRec?.clearRect(0, 0, canvas.width, canvas.height);
      this.ctxRec?.drawImage(image, 0, 0, canvas.width, canvas.height);
      this.signatureRecDessinee = true;
      this.cdr.markForCheck();
    };
    image.onerror = () => { this.error = 'La signature enregistrée ne peut pas être affichée.'; this.cdr.markForCheck(); };
    image.src = this.signatureAgentBase64;
  }

  enregistrerSignatureAgentEtContinuer(): void {
    if (!this.sigRecEl?.nativeElement || !this.signatureRecDessinee) {
      this.error = 'Dessinez votre signature avant de proposer son enregistrement.';
      return;
    }
    this.saving = true;
    this.agentSignatureService.saveMine(this.sigRecEl.nativeElement.toDataURL('image/png')).subscribe({
      next: () => {
        this.signatureAgentConfiguree = true;
        this.showSaveAgentSignatureModal = false;
        this.saving = false;
        this.creerFiche();
      },
      error: err => {
        this.saving = false;
        this.error = err?.error?.message || 'La signature n’a pas pu être enregistrée. Vous pouvez continuer sans la conserver.';
        this.cdr.markForCheck();
      }
    });
  }

  continuerSansEnregistrerSignature(): void {
    this.signatureSavePromptHandled = true;
    this.showSaveAgentSignatureModal = false;
    this.error = '';
    this.creerFiche();
  }

  clearSignatureRec() {
    this.clearSignature('rec');
  }
  clearSignatureClient() {
    this.signatureClientBase64 = '';
    this.clearSignature('client');
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const clientId = this.rdvData ? this.rdvData.clientId : Number(this.form.value.clientId);
    const vehiculeId = this.rdvData ? this.rdvData.vehiculeId : Number(this.form.value.vehiculeId);

    if (!clientId || !vehiculeId) {
      this.error = "Veuillez sélectionner un client et un véhicule.";
      return;
    }

    if (this.rdvData && !this.isRdvTodayOrPast(this.rdvData.dateRendezVous)) {
      this.error = "Impossible de générer la fiche atelier avant le jour du rendez-vous.";
      return;
    }

    if (!this.signatureRecDessinee || !this.signatureClientBase64 || !this.conditionsAcceptees) {
      this.error = 'Les deux signatures et l’acceptation des conditions sont obligatoires.';
      return;
    }

    if (!this.signatureAgentConfiguree && !this.signatureSavePromptHandled) {
      this.showSaveAgentSignatureModal = true;
      return;
    }
    this.creerFiche();
  }

  private creerFiche(): void {
    this.saving = true;
    this.error = '';

    const clientId = this.rdvData ? this.rdvData.clientId : Number(this.form.value.clientId);
    const vehiculeId = this.rdvData ? this.rdvData.vehiculeId : Number(this.form.value.vehiculeId);

    const { clientId: _c, vehiculeId: _v, lignesReception: _lr, lignesDefauts: _ld, ...formVals } = this.form.value;

    const rdvId = this.rdvData ? this.rdvData.id : this.rendezVousId;

    const rawReception = this.lignesReception.getRawValue() || [];
    const formattedReception = rawReception.map((r: any) => ({
      nom: r.nom,
      etat: r.etat === true ? true : (r.etat === false ? false : null),
      oui: r.etat === true,
      non: r.etat === false,
      etatStr: r.etat === true ? 'OUI' : (r.etat === false ? 'NON' : null),
      valeur: r.etat === true ? 'OUI' : (r.etat === false ? 'NON' : null)
    }));

    const rawDefauts = this.lignesDefauts.getRawValue() || [];
    const formattedDefauts = rawDefauts.map((d: any) => {
      const isPresent = d.present === true || (typeof d.designation === 'string' && d.designation.trim().length > 0);
      const designationText = d.designation ? d.designation.trim() : '';
      return {
        nom: d.nom,
        present: isPresent,
        designation: designationText,
        description: designationText,
        defaut: designationText,
        valeur: designationText
      };
    });

    const request: FicheAtelierRequest = {
      rendezVousId: rdvId || null,
      clientId: clientId,
      vehiculeId: vehiculeId,
      ...formVals,
      lignesReception: formattedReception,
      reception: formattedReception,
      lignesDefauts: formattedDefauts,
      defautsConstates: formattedDefauts,
      defauts: formattedDefauts,
      signatureReceptionnaireBase64: this.sigRecEl ? this.sigRecEl.nativeElement.toDataURL('image/png') : undefined,
      signatureBase64: this.signatureClientBase64 || undefined,
      conditionsAcceptees: this.conditionsAcceptees
    };

    this.service.create(request).subscribe({
      next: () => {
        if (rdvId) {
          this.rdvService.updateStatut(rdvId, 'TERMINE').subscribe({
            next: () => {
              this.saving = false;
              this.success = "Fiche atelier créée avec succès !";
              this.cdr.markForCheck();
              setTimeout(() => {
                this.router.navigate(['/app/fiches-atelier']);
              }, 1200);
            },
            error: () => {
              this.saving = false;
              this.success = "Fiche atelier créée avec succès !";
              this.cdr.markForCheck();
              setTimeout(() => {
                this.router.navigate(['/app/fiches-atelier']);
              }, 1200);
            }
          });
        } else {
          this.saving = false;
          this.success = "Fiche atelier créée avec succès !";
          
          this.cdr.markForCheck();
          setTimeout(() => {
            this.router.navigate(['/app/fiches-atelier']);
          }, 1200);
        }
      },
      error: (err) => {
        this.saving = false;
        this.error = err.error?.message || err.error || "Erreur lors de la création de la fiche atelier.";
        this.cdr.markForCheck();
      }
    });
  }

  goBack() {
    if (this.rendezVousId) {
      this.router.navigate(['/app/rendezvous']);
    } else {
      this.router.navigate(['/app/fiches-atelier']);
    }
  }
}
