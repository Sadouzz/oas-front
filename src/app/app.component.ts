import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CookiePopupComponent } from './shared/components/cookie-popup/cookie-popup.component';
import { WrenchCursorComponent } from './shared/components/wrench-cursor/wrench-cursor';
import { RouteLoaderComponent } from './shared/components/route-loader/route-loader';
import { SparksCanvasComponent } from './shared/components/sparks-canvas/sparks-canvas';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CookiePopupComponent,
    RouteLoaderComponent,
    SparksCanvasComponent
  ],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  title = 'facturation-front';

  ngOnInit(): void {
    if (environment.production && 'serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/ngsw-worker.js').catch(() => undefined);
    }
  }
}
