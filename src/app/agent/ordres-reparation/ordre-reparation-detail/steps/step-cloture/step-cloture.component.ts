import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { OrdreReparation } from '../../../../../shared/models';

@Component({
  selector: 'app-step-cloture',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './step-cloture.component.html'
})
export class StepClotureComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(OrdreReparationService);
  ordre: OrdreReparation | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (id) this.service.getById(Number(id)).subscribe({ next: data => this.ordre = data });
  }
}
