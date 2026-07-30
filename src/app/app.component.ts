import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CookiePopupComponent } from './shared/components/cookie-popup/cookie-popup.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CookiePopupComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  title = 'facturation-front';
}
