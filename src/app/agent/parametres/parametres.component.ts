import { inject, Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { DepotService } from '../pieces-detachees/depot.service';
import { CategoriePieceService } from '../pieces-detachees/categorie-piece.service';
import { CategorieMainDoeuvreService } from '../main-doeuvre/categorie-main-doeuvre.service';
import { FicheAtelierConfigService } from '../fiches-atelier/fiche-atelier-config.service';
import {
  Depot,
  CategoriePiece,
  CategorieMainDoeuvreModel,
  CategorieMainDoeuvreRequest,
  FicheAtelierConfigBackend,
  BriqueConfig,
  FicheAtelierFullConfig,
  parseFicheAtelierConfig
} from '../../shared/models';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './parametres.component.html'
})
export class ParametresComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private querySub?: Subscription;

  activeTab = 'depots';

  depots: Depot[] = [];
  categories: CategoriePiece[] = [];
  categoriesMO: CategorieMainDoeuvreModel[] = [];
  
  // FicheAtelier
  backendConfig: FicheAtelierConfigBackend | null = null;
  fullConfig: FicheAtelierFullConfig = parseFicheAtelierConfig();
  configs: BriqueConfig[] = [];

  newDepot: Depot = { nom: '' };
  newCategorie: CategoriePiece = { nom: '', depot: { id: 0 } };
  newCategorieMO: CategorieMainDoeuvreRequest = { nom: '' };
  newConfig: BriqueConfig = { label: '', type: 'text' };

  constructor(
    private depotService: DepotService,
    private categorieService: CategoriePieceService,
    private catMOService: CategorieMainDoeuvreService,
    private configService: FicheAtelierConfigService
  ) {}

  ngOnInit() {
    this.querySub = this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab && ['depots', 'categories', 'categories-mo', 'configs'].includes(tab)) {
        this.activeTab = tab;
        this.cdr.markForCheck();
      }
    });
    this.loadData();
  }

  ngOnDestroy() {
    this.querySub?.unsubscribe();
  }

  loadData() {
    this.depotService.getAll().subscribe(data => {
      this.depots = data;
      if (this.depots.length > 0 && (!this.newCategorie.depot || this.newCategorie.depot.id === 0)) {
        this.newCategorie.depot = { id: this.depots[0].id || 0 };
      }
    });
    this.categorieService.getAll().subscribe(data => this.categories = data);
    this.catMOService.getAll().subscribe(data => this.categoriesMO = data || []);
    this.loadConfigs();
  }

  loadConfigs() {
    this.configService.getAll().subscribe(data => {
      if (data && data.length > 0) {
        this.backendConfig = data[0];
        this.fullConfig = parseFicheAtelierConfig(this.backendConfig.configJson);
        this.configs = this.fullConfig.briques;
      } else {
        this.backendConfig = null;
        this.fullConfig = parseFicheAtelierConfig();
        this.configs = [];
      }
      this.cdr.markForCheck();
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
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

  saveCategorieMO() {
    if(!this.newCategorieMO.nom?.trim()) return;
    this.catMOService.create({ nom: this.newCategorieMO.nom.trim() }).subscribe(() => {
      this.loadData();
      this.newCategorieMO = { nom: '' };
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
  deleteCategorieMO(id: number) { this.catMOService.delete(id).subscribe(() => this.loadData()); }
  
  deleteConfig(id: number) {
    this.configs = this.configs.filter(c => c.id !== id);
    this.syncConfigWithBackend();
  }

  private syncConfigWithBackend() {
    this.fullConfig.briques = this.configs;
    const configJson = JSON.stringify(this.fullConfig);
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
