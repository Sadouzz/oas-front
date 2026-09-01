import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CookiePopupComponent } from './shared/components/cookie-popup/cookie-popup.component';
import { WrenchCursorComponent } from './shared/components/wrench-cursor/wrench-cursor';
import { RouteLoaderComponent } from './shared/components/route-loader/route-loader';
import { SparksCanvasComponent } from './shared/components/sparks-canvas/sparks-canvas';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CookiePopupComponent,
    RouteLoaderComponent,
    SparksCanvasComponent
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './app.component.html',
})
export class AppComponent {
  title = 'facturation-front';
}
