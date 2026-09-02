import { Component, HostListener, OnInit, inject, ChangeDetectorRef } from '@angular/core';

import { RouterLink, Router } from '@angular/router';
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
import { AuthService } from '../../core/services/auth.service';

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
  private cdr = inject(ChangeDetectorRef);

  
  statistiques: any[] = [];
  avantages: any[] = [];
  services: any[] = [];

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {}

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
  rdvWhatsappForm!: FormGroup;

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

    this.rdvWhatsappForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      telephone: ['', [Validators.required]],
      vehicule: ['', [Validators.required]],
      motif: ['', [Validators.required]],
      date: ['', [Validators.required]],
      heure: ['', [Validators.required]],
      note: ['']
    });

  }

  demanderRdv(): void {
    this.errorMessage = null;
    this.successMessage = null;
    this.showModal = true;
    document.body.classList.add('no-scroll');
  }

  onSubmitRdvWhatsapp(): void {
    if (this.rdvWhatsappForm.invalid) {
      this.rdvWhatsappForm.markAllAsTouched();
      return;
    }

    const val = this.rdvWhatsappForm.value;
    const message = `Bonjour Orient Auto Service,\n\n` +
      `Je souhaite demander un rendez-vous :\n` +
      `- *Nom* : ${val.nom}\n` +
      `- *Téléphone* : ${val.telephone}\n` +
      `- *Véhicule* : ${val.vehicule}\n` +
      `- *Motif* : ${val.motif}\n` +
      `- *Date souhaitée* : ${val.date}\n` +
      `- *Heure souhaitée* : ${val.heure}\n` +
      (val.note ? `- *Notes* : ${val.note}\n` : '') +
      `\nMerci !`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/221785968642?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    this.closeModal();
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
    document.body.classList.remove('no-scroll');
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

    const formValue = this.loginForm.value;
    const payload = {
      username: formValue.email,
      password: formValue.motDePasse
    };

    this.authService.login(payload as any).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.successMessage = 'Connexion réussie ! Redirection en cours...';
        
        setTimeout(() => {
          this.closeModal();
          this.router.navigate(['/client']);
        }, 1200);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = 'Identifiants incorrects ou erreur serveur.';
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

    const formValue = this.registerForm.value;
    const payload = {
      firstName: formValue.prenom,
      lastName: formValue.nom,
      email: formValue.email,
      phone: formValue.telephone,
      login: formValue.email,
      password: formValue.motDePasse,
      type: 'CLIENT'
    };

    this.authService.register(payload as any).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Compte créé avec succès ! Vous pouvez vous connecter.';
        this.registerForm.reset();
        setTimeout(() => {
          this.activeTab = 'login';
        }, 1500);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la création du compte.';
      }
    });

  }

}