import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SectionTitle } from '../../shared/components/section-title/section-title';
import { MagneticCarouselComponent, MagneticItem } from '../../shared/components/magnetic-carousel/magnetic-carousel';
import { InteractiveServicesListComponent } from '../../shared/components/interactive-services-list/interactive-services-list';
import { BentoServicesComponent } from '../../shared/components/bento-services/bento-services';
import { ButtonCarouselComponent } from '../../shared/components/button-carousel/button-carousel';
import { register } from 'swiper/element/bundle';

register();

interface Testimonial {
  id: number;
  text: string;
  author: string;
  location: string;
  imageSrc: string;
}

interface Partner {
  name: string;
  logoUrl: string;
  heightClass: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink, 
    SectionTitle, 
    MagneticCarouselComponent, 
    InteractiveServicesListComponent, 
    BentoServicesComponent, 
    ButtonCarouselComponent
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Home {
  servicesImages: MagneticItem[] = [
    { id: 1, title: 'Mécanique générale', slug: 'mecanique-generale', description: 'Toutes les réparations mécaniques pour votre moteur et boîte de vitesses.', src: 'https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=800&auto=format&fit=crop' },
    { id: 2, title: 'Diagnostic électronique', slug: 'diagnostic-electronique', description: 'Lecture des codes défauts avec valises multimarques de dernière génération.', src: 'https://images.unsplash.com/photo-1635835694200-a4a350080648?q=80&w=800&auto=format&fit=crop' },
    { id: 3, title: 'Entretien', slug: 'entretien', description: 'Entretien régulier pour garantir la fiabilité et la longévité de votre véhicule.', src: 'https://images.unsplash.com/photo-1632823471565-1ec2a74c2e6f?q=80&w=800&auto=format&fit=crop' },
    { id: 4, title: 'Vidange', slug: 'vidange', description: 'Changement d\'huile et filtres essentiels pour préserver votre moteur.', src: 'https://images.unsplash.com/photo-1610642436733-66236b3346e2?q=80&w=800&auto=format&fit=crop' },
    { id: 5, title: 'Freinage', slug: 'freinage', description: 'Contrôle et remplacement de plaquettes, disques et liquide de freins.', src: 'https://images.unsplash.com/photo-1486262715619-6708146fb236?q=80&w=800&auto=format&fit=crop' },
    { id: 6, title: 'Suspension', slug: 'suspension', description: 'Remplacement d\'amortisseurs, rotules, et géométrie complète.', src: 'https://images.unsplash.com/photo-1596468903328-98e6047a0523?q=80&w=800&auto=format&fit=crop' },
    { id: 7, title: 'Climatisation', slug: 'climatisation', description: 'Recharge de gaz, recherche de fuite et désinfection du circuit.', src: 'https://images.unsplash.com/photo-1579893963473-cbcf2eb98b4b?q=80&w=800&auto=format&fit=crop' },
    { id: 8, title: 'Electricité auto', slug: 'electricite-auto', description: 'Réparation des faisceaux, alternateurs et démarreurs.', src: 'https://images.unsplash.com/photo-1621217736657-3a139a066440?q=80&w=800&auto=format&fit=crop' },
    { id: 9, title: 'Carrosserie', slug: 'carrosserie', description: 'Débosselage, réparation suite à collision et redressage.', src: 'https://images.unsplash.com/photo-1590498305417-640a3dd90dcb?q=80&w=800&auto=format&fit=crop' },
    { id: 10, title: 'Peinture', slug: 'peinture', description: 'Peinture complète ou raccord dans notre cabine professionnelle.', src: 'https://images.unsplash.com/photo-1599573887019-35a0d312c1fb?q=80&w=800&auto=format&fit=crop' },
    { id: 11, title: 'Pneumatiques', slug: 'pneumatiques', description: 'Montage, équilibrage et réparation de vos pneus toutes saisons.', src: 'https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?q=80&w=800&auto=format&fit=crop' },
    { id: 12, title: 'Batterie', slug: 'batterie', description: 'Test de charge, remplacement de batterie et diagnostic électrique.', src: 'https://images.unsplash.com/photo-1607316715877-482a5c4e4c27?q=80&w=800&auto=format&fit=crop' },
    { id: 13, title: 'Remorquage', slug: 'remorquage', description: 'Service de dépannage et remorquage de votre véhicule en panne.', src: 'https://images.unsplash.com/photo-1520624029259-71ee51a1d137?q=80&w=800&auto=format&fit=crop' },
    { id: 14, title: 'Révision', slug: 'revision', description: 'Révision avec garantie constructeur préservée sur tous modèles.', src: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=800&auto=format&fit=crop' }
  ];
  testimonialsData: Testimonial[] = [
    {
        id: 1,
        text: "I’ve been shopping at this store for a few months now, and I can confidently say it’s one of the best online shopping experiences I've had. From the seamless ordering process to the fast delivery, everything has been top-notch.",
        author: "Sophia M.",
        location: "San Francisco, CA",
        imageSrc: "https://maya-theme-empower.myshopify.com/cdn/shop/files/testimonial_4.webp?v=1746436221&width=400"
    },
    {
        id: 2,
        text: "I recently ordered a few items from the 'Stay Warm & Stylish' collection, and I couldn’t be happier. The jacket I bought is both warm and trendy, and I’ve received so many compliments! The material is high quality, and it fits just right.",
        author: "John P.",
        location: "Austin, TX",
        imageSrc: "https://maya-theme-empower.myshopify.com/cdn/shop/files/testimonial_6.webp?v=1746436221&width=400"
    },
    {
        id: 3,
        text: "As someone who is conscious about the environment, I was thrilled to find a clothing brand that offers an eco-friendly collection without sacrificing style. The clothes are beautiful, comfortable.",
        author: "Emily R.",
        location: "Miami, FL",
        imageSrc: "https://maya-theme-empower.myshopify.com/cdn/shop/files/testimonial_1.webp?v=1746436221&width=400"
    },
    {
        id: 4,
        text: "The whole shopping experience was fantastic. The website is user-friendly, and I found exactly what I was looking for without any hassle. My order arrived in perfect condition, and the clothing fits beautifully.",
        author: "Olivia T.",
        location: "Chicago, IL",
        imageSrc: "https://maya-theme-empower.myshopify.com/cdn/shop/files/testimonial_5.webp?v=1746436222&width=400"
    },
    {
        id: 5,
        text: "I’ve been a loyal customer for over a year, and I keep coming back because of the excellent quality and stylish designs. Whether I’m looking for casual wear or something a bit dressier, I can always find something that fits my style perfectly.",
        author: "Liam W.",
        location: "Los Angeles, CA",
        imageSrc: "https://maya-theme-empower.myshopify.com/cdn/shop/files/testimonial_7.webp?v=1746436221&width=400"
    },
    {
        id: 6,
        text: "I recently ordered from the 'Trendy & Comfortable' collection, and I am so impressed with the quality and design. The items are versatile enough to wear for various occasions, from work to weekend outings.",
        author: "Mark J.",
        location: "New York, NY",
        imageSrc: "https://maya-theme-empower.myshopify.com/cdn/shop/files/testimonial_8.webp?v=1746436221&width=400"
    }
  ];

  partners: Partner[] = [
    { name: 'Partner 1', logoUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=400&auto=format&fit=crop', heightClass: 'h-16 rounded-md' },
    { name: 'Partner 2', logoUrl: 'https://images.unsplash.com/photo-1503376712351-1b2d3c96048c?q=80&w=400&auto=format&fit=crop', heightClass: 'h-16 rounded-md' },
    { name: 'Partner 3', logoUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?q=80&w=400&auto=format&fit=crop', heightClass: 'h-16 rounded-md' },
    { name: 'Partner 4', logoUrl: 'https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=400&auto=format&fit=crop', heightClass: 'h-16 rounded-md' },
    { name: 'Partner 5', logoUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=400&auto=format&fit=crop', heightClass: 'h-16 rounded-md' },
    { name: 'Partner 6', logoUrl: 'https://images.unsplash.com/photo-1504215680853-026ed2a45def?q=80&w=400&auto=format&fit=crop', heightClass: 'h-16 rounded-md' },
  ];
}
