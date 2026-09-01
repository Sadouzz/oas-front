
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SERVICES } from './services.data';
import { SectionTitle } from '../../shared/components/section-title/section-title';
import { TireTrackComponent } from '../../shared/components/tire-track/tire-track';

@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [RouterLink, SectionTitle, TireTrackComponent],
  templateUrl: './service-detail.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './service-detail.css',
})
export class ServiceDetail {
  private readonly route = inject(ActivatedRoute);
  readonly service = toSignal(
    this.route.paramMap.pipe(map(params => SERVICES.find(service => service.slug === params.get('slug')))),
    { initialValue: undefined },
  );
}
