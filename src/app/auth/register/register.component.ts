import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  form: FormGroup = this.fb.group({
    matricule: ['', Validators.required], // Generé par le service
    phone: ['', Validators.required],
    login: ['', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    type: ['', Validators.required],
    role: [''],
  });

  typeOptions = ['CLIENT', 'AGENT'];
  roleOptions = ['SUPER_AGENT', 'AGENT', 'CHEF_ATELIER', 'AGENT_MAGASIN'];

  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { role, ...payload } = this.form.value;

    this.authService.register(payload).subscribe({
      next: () => {
        this.successMessage = 'Compte créé avec succès ! Redirection...';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Une erreur est survenue.';
      }
    });
  }

  f(name: string) { return this.form.get(name); }
}
