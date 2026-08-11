import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-bolt-corners',
  standalone: true,
  imports: [],
  templateUrl: './bolt-corners.html',
  styleUrl: './bolt-corners.css',
})
export class BoltCornersComponent {
  /** Couleur des vis : 'dark' (gris foncé) | 'light' (argent) | 'red' (rouge OAS) */
  @Input() variant: 'dark' | 'light' | 'red' = 'dark';
  /** Taille de la vis en px */
  @Input() size: number = 14;
  /** Décalage par rapport aux coins en px */
  @Input() offset: number = 6;
}
