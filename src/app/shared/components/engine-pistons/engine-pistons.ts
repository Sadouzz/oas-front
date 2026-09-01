import { Component, Input, ChangeDetectionStrategy } from '@angular/core';


@Component({
  selector: 'app-engine-pistons',
  standalone: true,
  imports: [],
  templateUrl: './engine-pistons.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './engine-pistons.css',
})
export class EnginePistonsComponent {
  @Input() opacity: number = 0.12;
}
