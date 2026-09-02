import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  NgZone,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  life: number;
}

@Component({
  selector: 'app-sparks-canvas',
  standalone: true,
  imports: [],
  templateUrl: './sparks-canvas.html',
  styleUrl: './sparks-canvas.css',
})
export class SparksCanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sparksCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D | null = null;
  private sparks: Spark[] = [];
  private isRunning = false;
  private rafId: number | null = null;

  // Couleurs d'une soudure électrique : blanc chaud, bleu électrique, cyan étincelant et quelques éclats ambrés
  private colors = [
    '#ffffff', // Blanc ultra-lumineux
    '#00f0ff', // Cyan électrique
    '#0088ff', // Bleu étincelle
    '#00ffff', // Turquoise
    '#ffaa00', // Métal en fusion (orange)
  ];

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private ngZone: NgZone,
    private router: Router
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    this.resizeCanvas();

    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('resize', this.onResize);
      window.addEventListener('mousedown', this.onMouseDown, { passive: true });
    });
  }

  private onResize = (): void => {
    this.resizeCanvas();
  };

  private resizeCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (this.router.url.startsWith('/agent')) {
      return;
    }

    // Coordonnées du clic
    const x = e.clientX;
    const y = e.clientY;

    // Crée entre 12 et 18 étincelles par clic
    const count = 12 + Math.floor(Math.random() * 7);
    for (let i = 0; i < count; i++) {
      this.createSpark(x, y);
    }

    // Démarre la boucle d'animation si elle n'est pas active
    if (!this.isRunning) {
      this.isRunning = true;
      this.ngZone.runOutsideAngular(() => {
        this.tick();
      });
    }
  };

  private createSpark(x: number, y: number): void {
    // Angle aléatoire principalement dirigé vers le haut et les côtés
    const angle = Math.PI * 1.1 + Math.random() * Math.PI * 0.8; // Éventail vers le haut (-180° à +180° environ)
    const speed = 4 + Math.random() * 8; // Vitesse de projection initiale rapide
    
    this.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (1 + Math.random() * 3), // Poussée verticale initiale supplémentaire
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      size: 1 + Math.random() * 2.2, // Petite taille réaliste
      alpha: 1,
      decay: 0.015 + Math.random() * 0.025, // Durée de vie variable (environ 30 à 60 frames)
      life: 1.0
    });
  }

  private tick = (): void => {
    if (!this.ctx || !this.canvasRef) {
      this.isRunning = false;
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Gravité et friction
    const gravity = 0.38;
    const friction = 0.96;

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];

      // Applique la gravité et la friction
      s.vx *= friction;
      s.vy *= friction;
      s.vy += gravity;

      // Sauvegarde des anciennes coordonnées pour dessiner un filet/traînée de vitesse
      const oldX = s.x;
      const oldY = s.y;

      // Déplacement
      s.x += s.vx;
      s.y += s.vy;

      // Extinction progressive
      s.alpha -= s.decay;

      if (s.alpha <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }

      // Dessin de l'étincelle sous forme de trait (streak) de vitesse
      this.ctx.beginPath();
      this.ctx.strokeStyle = s.color;
      this.ctx.lineWidth = s.size;
      this.ctx.globalAlpha = s.alpha;
      this.ctx.lineCap = 'round';
      
      // La traînée est proportionnelle à la vitesse
      this.ctx.moveTo(oldX, oldY);
      this.ctx.lineTo(s.x, s.y);
      this.ctx.stroke();
    }

    if (this.sparks.length > 0) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.isRunning = false;
    }
  };

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousedown', this.onMouseDown);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }
}
