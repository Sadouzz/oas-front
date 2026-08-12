import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, ChangeDetectorRef, Renderer2, OnInit, OnDestroy, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WrenchCursorComponent } from '../../../shared/components/wrench-cursor/wrench-cursor';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, WrenchCursorComponent],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.css',
})
export class PublicLayout implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('footer') footerRef!: ElementRef;
  footerHeight = 0;
  isCurtain = true;
  isMenuOpen = false;

  headerLeftLinks: { label: string, path: string, exact?: boolean }[] = [
    { label: 'Le garage', path: '/a-propos' },
    { label: 'Nos Services', path: '/services' },
    { label: 'Réalisations', path: '/realisations' }
  ];
  
  headerRightLinks: { label: string, path: string, exact?: boolean }[] = [
    { label: 'Blog', path: '/blog' },
    { label: 'Marketplace', path: '/marketplace' },
    // { label: 'Devis', path: '/devis' },
    { label: 'RDV', path: '/rdv' },
    { label: 'Partenaires', path: '/partenaires' }
  ];

  footerSections = [
    {
      title: 'Découvrir',
      links: [
        { label: 'Blog', path: '/blog' },
        { label: 'Nos services', path: '/services' },
        { label: 'Réalisations', path: '/realisations' },
        { label: 'Marketplace', path: '/marketplace' }
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
    { label: 'Facebook', url: 'https://www.facebook.com/orientautoservice' },
    { label: 'Instagram', url: 'https://www.instagram.com/oassenegal/' },
    { label: 'TikTok', url: 'https://www.tiktok.com/@orient.auto.servi' }
  ];

  contactInfo = {
    email: 'orientautoservice@gmail.com',
    phone: '+221 33 821 47 11 / +221 78 596 86 42',
    addressLine1: 'km 2,5 Bd du Centenaire Rond Point CYRNOS',
    addressLine2: 'BP : 14092 Dakar - Sénégal',
    hoursDays: 'Lundi - Vendredi',
    hoursTime: '08:00 AM - 18:00 PM'
  };

  legalLinks = [
    { label: 'Termes & Conditions', path: '/mentions-legales' },
    { label: 'Confidentialité', path: '/confidentialite' },
    { label: 'Cookies', path: '/cookies' }
  ];

  constructor(
    private cdr: ChangeDetectorRef,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit() {
    this.renderer.addClass(this.document.body, 'public-cursor');
  }

  ngOnDestroy() {
    this.renderer.removeClass(this.document.body, 'public-cursor');
  }

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
