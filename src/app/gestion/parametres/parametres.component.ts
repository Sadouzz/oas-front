import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepotService, Depot } from '../../services/depot.service';
import { CategoriePieceService, CategoriePiece } from '../../services/categorie-piece.service';
import { FicheAtelierConfigService, FicheAtelierConfigBackend, BriqueConfig } from '../../services/fiche-atelier-config.service';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parametres.component.html'
})
export class ParametresComponent implements OnInit {
  activeTab = 'depots';

  depots: Depot[] = [];
  categories: CategoriePiece[] = [];
  
  // FicheAtelier
  backendConfig: FicheAtelierConfigBackend | null = null;
  configs: BriqueConfig[] = [];

  newDepot: Depot = { nom: '' };
  newCategorie: CategoriePiece = { nom: '', depot: { id: 0 } };
  newConfig: BriqueConfig = { label: '', type: 'text' };

  constructor(
    private depotService: DepotService,
    private categorieService: CategoriePieceService,
    private configService: FicheAtelierConfigService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.depotService.getAll().subscribe(data => {
      this.depots = data;
      if (this.depots.length > 0 && (!this.newCategorie.depot || this.newCategorie.depot.id === 0)) {
        this.newCategorie.depot = { id: this.depots[0].id || 0 };
      }
    });
    this.categorieService.getAll().subscribe(data => this.categories = data);
    this.loadConfigs();
  }

  loadConfigs() {
    this.configService.getAll().subscribe(data => {
      if (data && data.length > 0) {
        this.backendConfig = data[0];
        try {
          this.configs = JSON.parse(this.backendConfig.configJson || '[]');
        } catch(e) {
          this.configs = [];
        }
      } else {
        this.backendConfig = null;
        this.configs = [];
      }
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  saveDepot() {
    if(!this.newDepot.nom) return;
    this.depotService.create(this.newDepot).subscribe(() => {
      this.loadData();
      this.newDepot = { nom: '' };
    });
  }

  saveCategorie() {
    if(!this.newCategorie.nom || !this.newCategorie.depot?.id) return;
    this.categorieService.create(this.newCategorie).subscribe(() => {
      this.loadData();
      this.newCategorie = { nom: '', depot: { id: this.depots.length > 0 ? (this.depots[0].id || 0) : 0 } };
    });
  }

  saveConfig() {
    if(!this.newConfig.label || !this.newConfig.type) return;
    
    // Generate a pseudo-ID for local tracking
    this.newConfig.id = new Date().getTime();
    this.configs.push({...this.newConfig});
    
    this.syncConfigWithBackend();
    
    this.newConfig = { label: '', type: 'text' };
  }

  deleteDepot(id: number) { this.depotService.delete(id).subscribe(() => this.loadData()); }
  deleteCategorie(id: number) { this.categorieService.delete(id).subscribe(() => this.loadData()); }
  
  deleteConfig(id: number) {
    this.configs = this.configs.filter(c => c.id !== id);
    this.syncConfigWithBackend();
  }

  private syncConfigWithBackend() {
    const configJson = JSON.stringify(this.configs);
    if (this.backendConfig && this.backendConfig.id) {
      this.backendConfig.configJson = configJson;
      this.configService.update(this.backendConfig.id, this.backendConfig).subscribe(() => {
        this.loadConfigs();
      });
    } else {
      const newBackendConfig: FicheAtelierConfigBackend = { configJson: configJson };
      this.configService.create(newBackendConfig).subscribe(() => {
        this.loadConfigs();
      });
    }
  }

  getDepotName(depotId?: number): string {
    if (!depotId) return '-';
    const d = this.depots.find(d => d.id === depotId);
    return d ? d.nom : '-';
  }
}
