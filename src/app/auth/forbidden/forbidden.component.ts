import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

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
    const role = this.authService.getRole();
    if (role === 'ROLE_CLIENT') {
      this.router.navigate(['/client'], { replaceUrl: true });
    } else if (role === 'ROLE_TECHNICIEN') {
      this.router.navigate(['/technicien'], { replaceUrl: true });
    } else {
      this.router.navigate(['/agent/dashboard'], { replaceUrl: true });
    }
  }
}
