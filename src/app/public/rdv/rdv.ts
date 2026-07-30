import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import AOS from 'aos';

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

@Component({
  selector: 'app-rdv',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IconComponent,
    SectionTitle
  ],
  templateUrl: './rdv.html',
  styleUrl: './rdv.css'
})
export class RdvComponent implements OnInit {

  
  statistiques: any[] = [];
  avantages: any[] = [];
  services: any[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {

    this.initialiserDonnees();
    this.initialiserFormulaires();

    AOS.init({
      duration: 800,
      once: true,
      offset: 80,
      easing: 'ease-in-out'
    });

  }

  /**
   * Temporaire
   * Plus tard les données seront chargées via une API.
   */
  private initialiserDonnees(): void {

    this.statistiques = [
      { valeur: '5000+', label: 'Rendez-vous réalisés' },
      { valeur: '98%', label: 'Clients satisfaits' },
      { valeur: '15+', label: "Années d'expérience" },
      { valeur: '24/7', label: 'Assistance client' }
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

    const payload = this.loginForm.value;

    /**
     * TODO : remplacer par un appel au service d'authentification
     * (ex: this.authService.login(payload).subscribe(...))
     */
    setTimeout(() => {
      this.isSubmitting = false;
      this.successMessage = 'Connexion réussie ! Redirection en cours...';
      // ex: this.router.navigate(['/espace-client']);
    }, 1200);

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

    const payload = this.registerForm.value;

    /**
     * TODO : remplacer par un appel au service d'inscription
     * (ex: this.authService.register(payload).subscribe(...))
     */
    setTimeout(() => {
      this.isSubmitting = false;
      this.successMessage = 'Compte créé avec succès ! Vous pouvez vous connecter.';
      this.registerForm.reset();
      this.activeTab = 'login';
    }, 1200);

  }

}