import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-engine-pistons',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './engine-pistons.html',
  styleUrl: './engine-pistons.css',
})
export class EnginePistonsComponent {
  @Input() opacity: number = 0.12;
}
