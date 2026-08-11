import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [],
  templateUrl: './forbidden.component.html',
})
export class ForbiddenComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  goBack(): void {
    this.router.navigate(['/gestion/dashboard'], { replaceUrl: true });
  }
}
