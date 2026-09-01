import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { register } from 'swiper/element/bundle';
import AOS from 'aos';
import { IconComponent } from '../../shared/icon/icon';
import { SectionTitle } from '../../shared/components/section-title/section-title';
import { TireTrackComponent } from '../../shared/components/tire-track/tire-track';
import { BoltCornersComponent } from '../../shared/components/bolt-corners/bolt-corners';
import { PistonAccordionComponent } from '../../shared/components/piston-accordion/piston-accordion';

register();

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    IconComponent,
    SectionTitle,
    TireTrackComponent,
    BoltCornersComponent,
    PistonAccordionComponent
],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class ContactComponent implements OnInit {

  informations: any[] = [];
  questions: any[] = [];
  raisonsContact: string[] = [
    'Demander un devis',
    'Obtenir des informations',
    'Planifier une intervention',
    'Suivre votre véhicule'
  ];
  
  formulaire!: FormGroup;

  envoiEnCours = false;
  messageEnvoye = false;
  
  activeFaqIndex: number | null = null;

  toggleFaq(index: number) {
    this.activeFaqIndex = this.activeFaqIndex === index ? null : index;
  }

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {

    this.initialiserDonnees();
    this.initialiserFormulaire();

    AOS.init({
      duration: 800,
      once: true,
      offset: 80,
      easing: 'ease-in-out'
    });

  }

  private initialiserDonnees(): void {

    this.informations = [
      {
        icone: 'phone',
        titre: 'Téléphone',
        valeur: '+221 33 821 47 11 / 78 596 86 42',
        lien: 'tel:+221338214711',
        cible: '_self'
      },
      {
        icone: 'whatsapp',
        titre: 'WhatsApp',
        valeur: '+221 78 596 86 42',
        lien: 'https://wa.me/221785968642',
        cible: '_blank'
      },
      {
        icone: 'mail',
        titre: 'Email',
        valeur: 'orientautoservice@gmail.com',
        lien: 'mailto:orientautoservice@gmail.com',
        cible: '_self'
      },
      {
        icone: 'clock',
        titre: 'Horaires',
        valeur: 'Lun - Ven : 08h00 - 18h00',
        lien: null,
        cible: null
      }
    ];

    this.questions = [

      {
        question: 'Comment prendre un rendez-vous ?',
        reponse: 'Vous pouvez réserver directement depuis la page "Prendre rendez-vous" ou nous contacter par téléphone ou WhatsApp.'
      },

      {
        question: 'Proposez-vous un devis gratuit ?',
        reponse: 'Oui, un devis est réalisé gratuitement avant toute intervention.'
      },

      {
        question: 'Quels moyens de paiement acceptez-vous ?',
        reponse: 'Espèces, carte bancaire et Mobile Money.'
      },

      {
        question: 'Puis-je modifier mon rendez-vous ?',
        reponse: 'Oui, depuis votre espace client ou en nous contactant directement.'
      }

    ];

  }

  private initialiserFormulaire(): void {

    this.formulaire = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', Validators.required],
      sujet: ['', Validators.required],
      message: ['', Validators.required]
    });

  }

  get f() {
    return this.formulaire.controls;
  }

  onSubmit(): void {

    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }

    this.envoiEnCours = true;

    // TODO: brancher sur le service d'envoi (API / email)
    setTimeout(() => {

      this.envoiEnCours = false;
      this.messageEnvoye = true;
      this.formulaire.reset();

      setTimeout(() => this.messageEnvoye = false, 4000);

    }, 1200);

  }

}