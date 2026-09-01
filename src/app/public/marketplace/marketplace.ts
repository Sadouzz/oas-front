import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, HostListener, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Product } from '../../shared/models/product.model';
import { SectionTitle } from '../../shared/components/section-title/section-title';
import { IconComponent } from '../../shared/icon/icon';
import { MarketplaceService } from '../../services/marketplace.service';

function passwordsMatchValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const motDePasse = group.get('motDePasse')?.value;
    const confirmation = group.get('confirmation')?.value;
    if (!motDePasse || !confirmation) return null;
    return motDePasse === confirmation ? null : { passwordsMismatch: true };
  };
}

type OngletAuth = 'login' | 'register';
import AOS from 'aos';
import { register } from 'swiper/element/bundle';

register();

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SectionTitle, IconComponent],
  templateUrl: './marketplace.html',
  styleUrl: './marketplace.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Marketplace implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  products: Product[] = [];
  private marketplaceService = inject(MarketplaceService);

  activeCategory: 'Tous' | 'Vehicules' | 'Pieces' | 'Accessoires' = 'Tous';

  get filteredProducts(): Product[] {
    if (this.activeCategory === 'Tous') {
      return this.products;
    }
    return this.products.filter(p => p.categorie === this.activeCategory);
  }

  get featuredProducts(): Product[] {
    return this.products.filter(p => p.isVedette);
  }

  setCategory(category: 'Tous' | 'Vehicules' | 'Pieces' | 'Accessoires'): void {
    this.activeCategory = category;
  }

  // Modal state
  showModal = false;
  activeTab: OngletAuth = 'login';
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  showLoginPassword = false;
  showRegisterPassword = false;
  showRegisterConfirmation = false;
  selectedProduct: Product | null = null;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initialiserFormulaires();
    
    // Charger tous les produits du back
    this.marketplaceService.getAll().subscribe({
      next: (data) => {
        this.products = data;
        // Si aucun produit n'est en vedette, mettons les 2 premiers ou les véhicules en vedette pour le carrousel
        const hasVedette = this.products.some(p => p.isVedette);
        if (!hasVedette && this.products.length > 0) {
          // Marquer les véhicules ou les 2 premiers comme vedettes pour l'affichage
          this.products.forEach((p, index) => {
            if (p.categorie === 'Vehicules' || index < 2) {
              p.isVedette = true;
            }
          });
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement des produits de la marketplace:', err);
      }
    });

    AOS.init({
      duration: 800,
      once: true,
      offset: 100,
      easing: 'ease-in-out',
    });
  }

  private initialiserFormulaires(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],
      seSouvenir: [false]
    });

    this.registerForm = this.fb.group(
      {
        prenom: ['', [Validators.required, Validators.minLength(2)]],
        nom: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        telephone: ['', [Validators.required, Validators.pattern(/^[0-9+\s]{8,15}$/)]],
        motDePasse: ['', [Validators.required, Validators.minLength(6)]],
        confirmation: ['', [Validators.required]],
        cgu: [false, [Validators.requiredTrue]]
      },
      { validators: passwordsMatchValidator() }
    );
  }

  openLoginModal(product: Product): void {
    this.selectedProduct = product;
    this.activeTab = 'login';
    this.showModal = true;
    document.body.classList.add('no-scroll');
    this.resetMessages();
  }

  openRegisterModal(): void {
    this.activeTab = 'register';
    this.showModal = true;
    document.body.classList.add('no-scroll');
    this.resetMessages();
  }

  switchTab(tab: OngletAuth): void {
    this.activeTab = tab;
    this.resetMessages();
  }

  closeModal(): void {
    this.showModal = false;
    document.body.classList.remove('no-scroll');
    this.isSubmitting = false;
    this.resetMessages();
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.showModal) this.closeModal();
  }

  private resetMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  private marquerChampsTouches(form: FormGroup): void {
    Object.values(form.controls).forEach(control => {
      control.markAsTouched();
      control.updateValueAndValidity();
    });
  }

  get lf() { return this.loginForm.controls; }

  onSubmitLogin(): void {
    this.resetMessages();
    if (this.loginForm.invalid) {
      this.marquerChampsTouches(this.loginForm);
      return;
    }
    this.isSubmitting = true;
    setTimeout(() => {
      this.isSubmitting = false;
      this.successMessage = `Connexion réussie ! Demande d'achat envoyée pour ${this.selectedProduct?.nom}.`;
      setTimeout(() => this.closeModal(), 2000);
    }, 1200);
  }

  get rf() { return this.registerForm.controls; }

  get motsDePassesDifferents(): boolean {
    return this.registerForm.hasError('passwordsMismatch') && !!this.rf['confirmation'].touched;
  }

  onSubmitRegister(): void {
    this.resetMessages();
    if (this.registerForm.invalid) {
      this.marquerChampsTouches(this.registerForm);
      return;
    }
    this.isSubmitting = true;
    setTimeout(() => {
      this.isSubmitting = false;
      this.successMessage = 'Compte créé avec succès ! Vous pouvez vous connecter.';
      this.registerForm.reset();
      this.activeTab = 'login';
    }, 1200);
  }
}
