import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-engine-pistons',
  standalone: true,
  imports: [],
  templateUrl: './engine-pistons.html',
  styleUrl: './engine-pistons.css',
})
export class EnginePistonsComponent {
  @Input() opacity: number = 0.12;
}
