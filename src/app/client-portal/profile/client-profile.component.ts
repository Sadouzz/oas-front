import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientPortalService } from '../services/client-portal.service';
import { ClientProfileService } from '../services/client-profile.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertComponent],
  templateUrl: './client-profile.component.html',
})
export class ClientProfileComponent implements OnInit {
  private portalService = inject(ClientPortalService);
  private profileService = inject(ClientProfileService);
  private fb = inject(FormBuilder);

  private clientId: number | null = null;
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  form: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: [''],
    email: ['', Validators.email],
  });

  ngOnInit(): void {
    this.loading = true;
    this.portalService.getMe().subscribe({
      next: me => {
        this.clientId = me.id;
        this.form.patchValue({
          firstName: me.firstName,
          lastName: me.lastName,
          phone: me.phone,
          email: me.email,
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Impossible de charger votre profil.';
      },
    });
  }

  save(): void {
    if (this.form.invalid || !this.clientId) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.profileService.updateProfile(this.clientId, this.form.value).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Profil mis à jour avec succès.';
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err.error?.message || err.error || "Impossible de mettre à jour le profil.";
      },
    });
  }
}
