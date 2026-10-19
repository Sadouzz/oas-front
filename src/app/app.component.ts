import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CookiePopupComponent } from './shared/components/cookie-popup/cookie-popup.component';
import { environment } from '../environments/environment';
import { ConfirmationDialogComponent } from './shared/components/confirmation/confirmation-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CookiePopupComponent,
    ConfirmationDialogComponent
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
