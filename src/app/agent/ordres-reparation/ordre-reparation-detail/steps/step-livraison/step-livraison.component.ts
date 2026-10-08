import { Component, inject, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { OrdreReparation } from '../../../../../shared/models';

@Component({
  selector: 'app-step-livraison',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent],
  templateUrl: './step-livraison.component.html'
})
export class StepLivraisonComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  loadedOrdre: OrdreReparation | null = null;

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  garantieMois = 1;
  private signatureDessinee = false;
  private dessinEnCours = false;
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D | null;

  @ViewChild('signatureCanvas') set signatureCanvas(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this.canvas = ref?.nativeElement;
    this.ctx = this.canvas?.getContext('2d');
    if (this.ctx) {
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';
      this.ctx.strokeStyle = '#102a43';
    }
  }

  commencerSignature(event: MouseEvent | TouchEvent): void {
    if (!this.canvas || !this.ctx) return;
    event.preventDefault();
    this.dessinEnCours = true;
    const p = this.position(event);
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y);
  }

  dessinerSignature(event: MouseEvent | TouchEvent): void {
    if (!this.dessinEnCours || !this.ctx) return;
    event.preventDefault();
    const p = this.position(event);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    this.signatureDessinee = true;
  }

  terminerSignature(): void { this.dessinEnCours = false; }

  effacerSignature(): void {
    if (this.canvas && this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.signatureDessinee = false;
  }

  private position(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = this.canvas!.getBoundingClientRect();
    const point = event instanceof MouseEvent ? event : event.touches[0];
    return { x: (point.clientX - rect.left) * this.canvas!.width / rect.width,
      y: (point.clientY - rect.top) * this.canvas!.height / rect.height };
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-reparation']);
      return;
    }
    this.ordreId = +idParam;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.ordreService.getById(this.ordreId).subscribe({
      next: (o: OrdreReparation) => {
        this.loadedOrdre = o;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur chargement ordre.';
        this.cdr.markForCheck();
      }
    });
  }

  validateStep(): void {
    this.livrerVehicule();
  }

  livrerVehicule(): void {
    if (!this.canvas || !this.signatureDessinee || !Number.isInteger(this.garantieMois) || this.garantieMois < 1 || this.garantieMois > 120) {
      this.errorMessage = 'La signature et une garantie entre 1 et 120 mois sont obligatoires.';
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    this.ordreService.restituerVehicule(this.ordreId, this.canvas.toDataURL('image/png'), this.garantieMois).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Véhicule livré avec succès ! Redirection...';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'cloture']);
        }, 800);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la livraison.';
        this.cdr.markForCheck();
      }
    });
  }
}
