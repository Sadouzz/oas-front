import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, Event } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-route-loader',
  standalone: true,
  imports: [],
  templateUrl: './route-loader.html',
  styleUrl: './route-loader.css'
})
export class RouteLoaderComponent implements OnInit, OnDestroy {
  isLoading = false;
  private subscription?: Subscription;
  private timeoutId: any = null;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.subscription = this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationStart) {
        if (event.url.startsWith('/agent')) {
          this.isLoading = false;
          return;
        }
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.isLoading = true;
        this.cdr.detectChanges();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        // Garder un temps de chargement minimal de 400ms pour que l'animation soit fluide et visible
        this.timeoutId = setTimeout(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }, 450);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}
