import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PieceDetacheeService, PieceDetache } from '../../services/piece-detachee.service';
import { AuthService } from '../auth/services/auth.service';
import { LucideShoppingCart } from '@lucide/angular';

@Component({
  selector: 'app-seuil-alertes',
  standalone: true,
  imports: [CommonModule, LucideShoppingCart],
  templateUrl: './seuil-alertes.html'
})
export class SeuilAlertes implements OnInit {
  private service = inject(PieceDetacheeService);
  private authService = inject(AuthService);
  private router = inject(Router);

  pieces: PieceDetache[] = [];
  loading = false;
  readonly Math = Math;

  get canEdit(): boolean {
    const r = this.authService.getRole();
    return r === 'ROLE_SUPER_AGENT' || r === 'ROLE_MASTER' || r === 'ROLE_AGENT_MAGASIN';
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        this.pieces = data.sort((a: any, b: any) => b.id - a.id);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get lowStockPieces(): PieceDetache[] {
    return this.pieces.filter(p =>
      p.type === 'PDP' &&
      p.seuilMinimum != null &&
      (p.qteReelle ?? 0) <= p.seuilMinimum
    );
  }

  commanderPiece(p: PieceDetache) {
    this.router.navigate(['/gestion/bons-commande'], { queryParams: { pieceId: p.id } });
  }
}
