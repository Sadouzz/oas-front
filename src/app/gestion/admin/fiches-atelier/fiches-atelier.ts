import { Component, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FicheAtelierService } from '../../../services/fiche-atelier.service';
import { RendezVousService } from '../../../services/rendezvous.service';
import { RendezVous, FicheAtelierRequest } from '../../../shared/models';
import { LucidePlus, LucideTrash2, LucideArrowLeft, LucideSave, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-fiches-atelier',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucidePlus, LucideTrash2, LucideArrowLeft, LucideSave, LucideX],
  templateUrl: './fiches-atelier.html',
  styleUrl: './fiches-atelier.css',
})
export class FichesAtelier implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(FicheAtelierService);
  private rdvService = inject(RendezVousService);

  form!: FormGroup;
  rendezVousId: number | null = null;
  rdvData: RendezVous | null = null;
  loading = false;
  saving = false;
  error = '';
  success = '';
  showConditionsModal = false;
  conditionsAcceptees = false;

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

  defaultReception = [
    'Carrosserie',
    'Intérieur / Habitacle',
    'Vitrage / Pare-brise',
    'Eclairage',
    'Accessoires (Cric, roue de secours...)'
  ];

  defaultDefauts = [
    'Mécanique',
    'Électrique',
    'Climatisation',
    'Peinture',
    'Tôlerie'
  ];

  ngOnInit(): void {
    const rdvIdParam = this.route.snapshot.paramMap.get('rendezVousId');
    if (rdvIdParam) {
      this.rendezVousId = +rdvIdParam;
      this.loadRendezVousData();
    } else {
      this.error = "Aucun rendez-vous spécifié.";
    }

    this.initForm();
  }

  initForm() {
    this.form = this.fb.group({
      nomChauffeur: ['', Validators.required],
      telephoneChauffeur: [''],
      kilometrage: [null, [Validators.required, Validators.min(0)]],
      niveauEssence: [''],
      designationTravaux: ['', Validators.required],
      nb: [''],
      dateSortiePrevue: [''],
      garantie: [''],
      lignesReception: this.fb.array([]),
      lignesDefauts: this.fb.array([])
    });

    this.defaultReception.forEach(r => this.addReception(r));
    this.defaultDefauts.forEach(d => this.addDefaut(d));
  }

  get lignesReception() {
    return this.form.get('lignesReception') as FormArray;
  }

  get lignesDefauts() {
    return this.form.get('lignesDefauts') as FormArray;
  }

  addReception(nom: string = '') {
    this.lignesReception.push(this.fb.group({
      nom: [nom, Validators.required],
      etat: [null] // true = OUI, false = NON, null = non renseigné
    }));
  }

  removeReception(index: number) {
    this.lignesReception.removeAt(index);
  }

  addDefaut(nom: string = '') {
    this.lignesDefauts.push(this.fb.group({
      nom: [nom, Validators.required],
      designation: [''] // text field for user to write the defect description
    }));
  }

  removeDefaut(index: number) {
    this.lignesDefauts.removeAt(index);
  }

  loadRendezVousData() {
    this.loading = true;
    this.rdvService.getAll().subscribe({
      next: (rdvs) => {
        this.rdvData = rdvs.find(r => r.id === this.rendezVousId) || null;
        if (!this.rdvData) {
          this.error = "Rendez-vous introuvable.";
        } else {
          // Pre-fill some data if needed, e.g. from client/vehicule
          this.form.patchValue({
            designationTravaux: this.rdvData.motif
          });
        }
        this.loading = false;
      },
      error: () => {
        this.error = "Erreur lors du chargement du rendez-vous.";
        this.loading = false;
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
    
    let x, y;
    if (event instanceof MouseEvent) {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    } else if (event instanceof TouchEvent) {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    }

    if (x !== undefined && y !== undefined) {
      ctx.lineTo(x, y);
      ctx.stroke();
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
    const ctx = type === 'rec' ? this.ctxRec : this.ctxClient;
    const canvas = type === 'rec' ? this.sigRecEl?.nativeElement : this.sigClientEl?.nativeElement;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  accepterConditions() {
    this.conditionsAcceptees = true;
    this.showConditionsModal = false;
  }

  clearSignatureRec() {
    this.clearSignature('rec');
  }
  clearSignatureClient() {
    this.clearSignature('client');
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.rdvData) return;

    this.saving = true;
    this.error = '';

    const request: FicheAtelierRequest = {
        rendezVousId: this.rdvData.id,
        clientId: this.rdvData.clientId,
        vehiculeId: this.rdvData.vehiculeId,
        ...this.form.value,
        signatureReceptionnaireBase64: this.sigRecEl ? this.sigRecEl.nativeElement.toDataURL('image/png') : undefined,
        signatureBase64: this.sigClientEl ? this.sigClientEl.nativeElement.toDataURL('image/png') : undefined
      };

    // Format date string correctly if needed, or leave as is if datetime-local provides correct format
    if (request.dateSortiePrevue) {
      if (request.dateSortiePrevue.length === 10) {
        request.dateSortiePrevue = request.dateSortiePrevue + 'T00:00:00';
      } else if (request.dateSortiePrevue.endsWith('Z')) {
        request.dateSortiePrevue = request.dateSortiePrevue.slice(0, -1);
      }
    }

    this.service.create(request).subscribe({
      next: () => {
        this.saving = false;
        this.success = "Fiche atelier créée avec succès !";
        setTimeout(() => {
          this.router.navigate(['/gestion/rendezvous']);
        }, 1500);
      },
      error: (err) => {
        this.saving = false;
        this.error = err.error || "Erreur lors de la création de la fiche atelier.";
      }
    });
  }

  goBack() {
    this.router.navigate(['/gestion/rendezvous']);
  }
}
