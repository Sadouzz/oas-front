import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sheet-metal-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sheet-metal-card.html',
  styleUrl: './sheet-metal-card.css'
})
export class SheetMetalCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() hasWeld = true; // Affiche ou non la ligne de soudure sous le titre
}
