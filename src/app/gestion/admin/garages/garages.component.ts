import { Component, inject, OnInit } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GarageService } from '../../../services/garage.service';
import { LucidePlus, LucideEdit2, LucideTrash2, LucideX, LucideSave } from '@lucide/angular';

@Component({
  selector: 'app-garages',
  standalone: true,
  imports: [ReactiveFormsModule, LucidePlus, LucideEdit2, LucideTrash2, LucideX, LucideSave],
  templateUrl: './garages.component.html'
})
export class GaragesComponent implements OnInit {
  private garageService = inject(GarageService);
  private fb = inject(FormBuilder);

  garages: any[] = [];
  loading = true;
  
  showModal = false;
  garageForm: FormGroup;
  editingId: number | null = null;
  submitting = false;

  constructor() {
    this.garageForm = this.fb.group({
      nom: ['', Validators.required],
      localite: ['', Validators.required],
      prefixe: ['', Validators.required],
      numeroFixe: [''],
      numeroWhatsapp: [''],
      email: ['', [Validators.email]]
    });
  }

  ngOnInit() {
    this.loadGarages();
  }

  loadGarages() {
    this.loading = true;
    this.garageService.getAll().subscribe({
      next: (data) => {
        this.garages = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openModal(garage?: any) {
    this.showModal = true;
    if (garage) {
      this.editingId = garage.id;
      this.garageForm.patchValue(garage);
    } else {
      this.editingId = null;
      this.garageForm.reset();
    }
  }

  closeModal() {
    this.showModal = false;
    this.garageForm.reset();
    this.editingId = null;
  }

  saveGarage() {
    if (this.garageForm.invalid) {
      this.garageForm.markAllAsTouched();
      return;
    }
    
    this.submitting = true;
    const data = this.garageForm.value;
    
    const request$ = this.editingId 
      ? this.garageService.update(this.editingId, data)
      : this.garageService.create(data);
      
    request$.subscribe({
      next: () => {
        this.submitting = false;
        this.closeModal();
        this.loadGarages();
      },
      error: () => {
        this.submitting = false;
        alert('Une erreur est survenue lors de l\'enregistrement du garage.');
      }
    });
  }

  deleteGarage(id: number) {
    if (confirm('Voulez-vous vraiment supprimer/archiver ce garage ?')) {
      this.garageService.delete(id).subscribe(() => {
        this.loadGarages();
      });
    }
  }
}

