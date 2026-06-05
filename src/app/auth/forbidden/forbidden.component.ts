import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  templateUrl: './forbidden.component.html',
})
export class ForbiddenComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit(): void {
    // Si pas de session valide → redirect login (l'intercepteur gère le cas token expiré)
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { replaceUrl: true });
    }
    // Sinon : utilisateur connecté mais sans les droits → afficher la page 403
  }

  goBack(): void {
    this.router.navigate(['/dashboard'], { replaceUrl: true });
  }
}
