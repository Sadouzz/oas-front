import { Component, Input, ChangeDetectionStrategy } from '@angular/core';


@Component({
  selector: 'app-sheet-metal-card',
  standalone: true,
  imports: [],
  templateUrl: './sheet-metal-card.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sheet-metal-card.css'
})
export class SheetMetalCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() hasWeld = true; // Affiche ou non la ligne de soudure sous le titre
}
