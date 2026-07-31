import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.css',
})
export class PublicLayout implements AfterViewInit {
  @ViewChild('footer') footerRef!: ElementRef;
  footerHeight = 0;
  isCurtain = true;
  isMenuOpen = false;

  headerLeftLinks: { label: string, path: string, exact?: boolean }[] = [
    { label: 'Le garage', path: '/a-propos' },
    { label: 'Nos Services', path: '/services' },
    { label: 'Réalisations', path: '/realisations' }
    // { label: 'Accueil', path: '/', exact: true }
  ];
  
  headerRightLinks: { label: string, path: string, exact?: boolean }[] = [
    { label: 'Blog', path: '/blog' },
    { label: 'Devis', path: '/devis' },
    { label: 'RDV', path: '/rdv' },
    { label: 'Partenaires', path: '/partenaires' }
  ];

  footerSections = [
    {
      title: 'Découvrir',
      links: [
        { label: 'Blog', path: '/blog' },
        { label: 'Nos services', path: '/services' },
        { label: 'Réalisations', path: '/realisations' }
      ]
    },
    {
      title: 'OAS',
      links: [
        { label: 'Accueil', path: '/' },
        { label: 'A propos', path: '/a-propos' },
        { label: 'Demande de devis', path: '/contact' }
      ]
    },
    {
      title: 'Échanger',
      links: [
        { label: 'Contact', path: '/contact' },
        { label: 'Prise de rdv', path: '/rdv' },
        { label: 'Partenaires', path: '/partenaires' }
      ]
    },
    {
      title: 'Activités',
      links: [
        { label: 'Mécanique générale', path: '/services/mecanique-generale' },
        { label: 'Diagnostic électronique', path: '/services/diagnostic-electronique' },
        { label: 'Carrosserie & Peinture', path: '/services/carrosserie' },
        { label: 'Climatisation', path: '/services/climatisation' },
        { label: 'Pneumatiques', path: '/services/pneumatiques' }
      ]
    }
  ];

  socialLinks = [
    { label: 'Facebook', url: 'https://facebook.com' },
    { label: 'Instagram', url: 'https://instagram.com' },
    { label: 'Twitter', url: 'https://twitter.com' }
  ];

  contactInfo = {
    email: 'contact@oas-atelier.fr',
    phone: '+33 1 23 45 67 89',
    addressLine1: '123 Rue de la Mécanique',
    addressLine2: '75000 Paris',
    hoursDays: 'Lundi - Vendredi',
    hoursTime: '08:00 AM - 18:00 PM'
  };

  legalLinks = [
    { label: 'Termes & Conditions', path: '/mentions-legales' },
    { label: 'Confidentialité', path: '/confidentialite' },
    { label: 'Cookies', path: '/cookies' }
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    // Timeout to ensure rendering is complete before measuring
    setTimeout(() => this.updateFooterHeight(), 0);
  }

  @HostListener('window:resize')
  onResize() {
    this.updateFooterHeight();
  }

  updateFooterHeight() {
    if (!this.footerRef) return;
    const height = this.footerRef.nativeElement.offsetHeight;
    
    if (window.innerWidth < 1024 || height > window.innerHeight * 0.8) {
      this.isCurtain = false;
      this.footerHeight = 0;
    } else {
      this.isCurtain = true;
      this.footerHeight = height;
    }
    this.cdr.detectChanges();
  }
}
