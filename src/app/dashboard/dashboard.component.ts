import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { ClientService, UserModel } from '../services/client.service';
import { VehiculeService, VehiculeModel } from '../services/vehicule.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);

  recentClients: UserModel[] = [];
  recentVehicules: VehiculeModel[] = [];
  totalClients = 0;
  totalVehicules = 0;
  loading = true;

  get username(): string {
    return this.authService.getUser()?.username ?? '';
  }

  ngOnInit() {
    this.clientService.getAll().subscribe({
      next: (data) => {
        this.totalClients = data.length;
        this.recentClients = data.slice(0, 5);
        this.checkDone();
      },
      error: () => this.checkDone()
    });

    this.vehiculeService.getAll().subscribe({
      next: (data) => {
        this.totalVehicules = data.length;
        this.recentVehicules = data.slice(0, 5);
        this.checkDone();
      },
      error: () => this.checkDone()
    });
  }

  private loaded = 0;
  private checkDone() {
    if (++this.loaded >= 2) this.loading = false;
  }
}
