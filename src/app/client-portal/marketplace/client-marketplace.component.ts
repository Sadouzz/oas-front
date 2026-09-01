import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientMarketplaceService } from '../services/client-marketplace.service';
import { Produit } from '../models';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { ModalComponent } from '../ui/modal/modal.component';

@Component({
  selector: 'app-client-marketplace',
  standalone: true,
  imports: [ReactiveFormsModule, AlertComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './client-marketplace.component.html',
})
export class ClientMarketplaceComponent implements OnInit {
  private service = inject(ClientMarketplaceService);
  private fb = inject(FormBuilder);

  produits: Produit[] = [];
  filtered: Produit[] = [];
  loading = false;
  searchTerm = '';
  successMessage = '';
  errorMessage = '';

  selected: Produit | null = null;
  showDemandeModal = false;
  saving = false;

  form: FormGroup = this.fb.group({
    quantite: [1, [Validators.required, Validators.min(1)]],
    message: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.service.getProduits().subscribe({
      next: produits => {
        // Défense en profondeur : le back ne devrait renvoyer que les produits disponibles,
        // mais on filtre quand même les archivés côté client au cas où.
        this.produits = produits.filter(p => p.disponible && !p.archive);
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les produits du marketplace.';
        this.loading = false;
      },
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.produits.filter(p => !term
      || p.nom.toLowerCase().includes(term)
      || (p.description ?? '').toLowerCase().includes(term));
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.applyFilter();
  }

  openDemande(produit: Produit): void {
    this.selected = produit;
    this.form.reset({ quantite: 1, message: '' });
    this.errorMessage = '';
    this.showDemandeModal = true;
  }

  closeDemande(): void {
    this.showDemandeModal = false;
    this.selected = null;
  }

  submitDemande(): void {
    if (this.form.invalid || !this.selected) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    this.service.creerDemande({
      produitId: this.selected.id,
      quantite: this.form.value.quantite,
      message: this.form.value.message || null,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.showDemandeModal = false;
        this.selected = null;
        this.successMessage = 'Votre demande a été envoyée avec succès. Retrouvez-la dans "Mes commandes" sur votre profil.';
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err.error?.message || "Impossible d'envoyer la demande.";
      },
    });
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n ?? 0);
  }
}
