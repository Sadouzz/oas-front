import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SERVICES } from './services.data';
import { ScrollRevealDirective } from '../shared/scroll-reveal.directive';

@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ScrollRevealDirective],
  templateUrl: './service-detail.html',
  styleUrl: './service-detail.css',
})
export class ServiceDetail {
  private readonly route = inject(ActivatedRoute);
  readonly service = toSignal(
    this.route.paramMap.pipe(map(params => SERVICES.find(service => service.slug === params.get('slug')))),
    { initialValue: undefined },
  );
}
