import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  form: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  showPassword = false;
  loading = false;
  errorMessage = '';
  sessionExpiredMessage = '';

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['sessionExpired'] === 'true') {
        this.sessionExpiredMessage = 'Votre session a expiré. Veuillez vous reconnecter.';
      }
    });
  }

  features = [
    'Suivi des interventions en temps réel',
    'Gestion du stock et des pièces',
    'Facturation automatisée avec TVA',
    'Gestion multi-rôles et sécurité',
  ];

  // demoAccounts = [
  //   { role: 'Directeur',    email: 'directeur@oas.sn' },
  //   { role: 'Agent admin',  email: 'admin@oas.sn' },
  //   { role: 'Magasinier',   email: 'stock@oas.sn' },
  //   { role: 'Chef atelier', email: 'atelier@oas.sn' },
  // ];

  // Préremplit le formulaire — la soumission passe toujours par le vrai backend
  // fillDemo(username: string): void {
  //   this.form.patchValue({ username, password: '1234' });
  // }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.sessionExpiredMessage = '';

    this.authService.login(this.form.value).subscribe({
      next: () => this.router.navigate(['/dashboard'], { replaceUrl: true }),
        error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || "Nom d'utilisateur ou mot de passe incorrect.";
      }
    });
  }

  get username() { return this.form.get('username'); }
  get password() { return this.form.get('password'); }
}
