import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  templateUrl: './forbidden.component.html',
})
export class ForbiddenComponent {
  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
