import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import { IconComponent } from '../../shared/icon/icon';

/**
 * Vérifie que "motDePasse" et "confirmation" sont identiques.
 * Placé au niveau du FormGroup pour pouvoir comparer 2 champs entre eux.
 */
function passwordsMatchValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const motDePasse = group.get('motDePasse')?.value;
    const confirmation = group.get('confirmation')?.value;

    if (!motDePasse || !confirmation) {
      return null;
    }

    return motDePasse === confirmation ? null : { passwordsMismatch: true };
  };
}

type OngletAuth = 'login' | 'register';

import { SectionTitle } from '../../shared/components/section-title/section-title';
import { TireTrackComponent } from '../../shared/components/tire-track/tire-track';
import { SheetMetalCardComponent } from '../../shared/components/sheet-metal-card/sheet-metal-card';
import { BoltCornersComponent } from '../../shared/components/bolt-corners/bolt-corners';
import { SpeedometerComponent } from '../../shared/components/speedometer/speedometer';

@Component({
  selector: 'app-rdv',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IconComponent,
    SectionTitle,
    TireTrackComponent,
    SheetMetalCardComponent,
    BoltCornersComponent,
    SpeedometerComponent
  ],
  templateUrl: './rdv.html',
  styleUrl: './rdv.css'
})
export class RdvComponent implements OnInit {

  
  statistiques: any[] = [];
  avantages: any[] = [];
  services: any[] = [];

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {}

  ngOnInit(): void {

    this.initialiserDonnees();
    this.initialiserFormulaires();

  }

  /**
   * Temporaire
   * Plus tard les données seront chargées via une API.
   */
  private initialiserDonnees(): void {

    this.statistiques = [
      { value: 5000, max: 6000, suffix: '+', unit: 'RDV', label: 'Rendez-vous réalisés' },
      { value: 98, max: 100, suffix: '%', unit: '%', label: 'Clients satisfaits' },
      { value: 15, max: 25, suffix: '+', unit: 'ANS', label: "Années d'expérience" },
      { value: 24, max: 24, suffix: '/7', unit: 'H', label: 'Assistance client' }
    ];

    this.avantages = [
      {
        icone: 'calendar-check',
        titre: 'Gestion des rendez-vous',
        description: 'Consultez, modifiez ou annulez vos rendez-vous facilement.'
      },
      {
        icone: 'file-text',
        titre: 'Suivi des devis',
        description: 'Retrouvez tous vos devis en quelques secondes.'
      },
      {
        icone: 'file-check',
        titre: 'Factures',
        description: 'Téléchargez vos factures à tout moment.'
      },
      {
        icone: 'car',
        titre: 'Historique véhicule',
        description: 'Toutes les interventions restent enregistrées.'
      },
      {
        icone: 'bell',
        titre: 'Notifications',
        description: 'Recevez des rappels avant chaque rendez-vous.'
      },
      {
        icone: 'shield',
        titre: 'Compte sécurisé',
        description: 'Vos informations sont protégées.'
      }
    ];

    this.services = [
      {
        icone: 'wrench',
        titre: 'Expertise',
        description: 'Des techniciens qualifiés prennent en charge votre véhicule.'
      },
      {
        icone: 'timer',
        titre: 'Rapidité',
        description: 'Des délais maîtrisés et un service efficace.'
      },
      {
        icone: 'shield-heart',
        titre: 'Garantie',
        description: 'Des prestations fiables avec des pièces de qualité.'
      },
      {
        icone: 'headphones',
        titre: 'Assistance',
        description: 'Une équipe disponible pour vous accompagner.'
      }
    ];

  }

  /* ==========================================================
     MODALE (connexion / inscription)
  ========================================================== */

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

  demanderRdv(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/espace-client/rendez-vous']);
    } else {
      this.openLoginModal();
    }
  }

  openLoginModal(): void {
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
    document.body.classList.add('no-scroll');
    this.isSubmitting = false;
    this.resetMessages();
  }

  /** Ferme la modale avec la touche Échap */
  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.showModal) {
      this.closeModal();
    }
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

  /* -------------------- Connexion -------------------- */

  get lf() {
    return this.loginForm.controls;
  }

  onSubmitLogin(): void {

    this.resetMessages();

    if (this.loginForm.invalid) {
      this.marquerChampsTouches(this.loginForm);
      return;
    }

    this.isSubmitting = true;

    const payload = {
      username: this.loginForm.value.email,
      password: this.loginForm.value.motDePasse
    };

    this.authService.login(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.successMessage = 'Connexion réussie ! Redirection en cours...';
        setTimeout(() => this.router.navigate(['/espace-client/rendez-vous']), 1200);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = 'Identifiants incorrects.';
      }
    });

  }

  /* -------------------- Inscription -------------------- */

  get rf() {
    return this.registerForm.controls;
  }

  get motsDePassesDifferents(): boolean {
    return (
      this.registerForm.hasError('passwordsMismatch') &&
      !!this.rf['confirmation'].touched
    );
  }

  onSubmitRegister(): void {

    this.resetMessages();

    if (this.registerForm.invalid) {
      this.marquerChampsTouches(this.registerForm);
      return;
    }

    this.isSubmitting = true;

    const formData = this.registerForm.value;
    const payload = {
      matricule: 'CL-' + Date.now().toString().slice(-6),
      phone: formData.telephone,
      login: formData.email,
      firstName: formData.prenom,
      lastName: formData.nom,
      email: formData.email,
      password: formData.motDePasse,
      type: 'CLIENT'
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Compte créé avec succès ! Vous pouvez vous connecter.';
        this.registerForm.reset();
        setTimeout(() => this.activeTab = 'login', 1200);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = "Une erreur s'est produite lors de l'inscription.";
      }
    });

  }

}