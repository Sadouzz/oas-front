import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FicheAtelierConfigService } from '../../fiches-atelier/fiche-atelier-config.service';
import { BriqueConfig, FicheAtelierConfigBackend } from '../../../shared/models';

@Component({
  selector: 'app-fiche-atelier-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fiche-atelier-config.component.html'
})
export class FicheAtelierConfigComponent implements OnInit {
  private configService = inject(FicheAtelierConfigService);

  backendConfig: FicheAtelierConfigBackend | null = null;
  configs: BriqueConfig[] = [];
  isLoading = false;

  newConfig: BriqueConfig = { label: '', type: 'text', obligatoire: false, options: '' };

  ngOnInit() {
    this.loadConfigs();
  }

  loadConfigs() {
    this.isLoading = true;
    this.configService.getAll().subscribe({
      next: (data) => {
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
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement configuration fiche atelier', err);
        this.isLoading = false;
      }
    });
  }

  saveConfig() {
    if (!this.newConfig.label?.trim() || !this.newConfig.type) return;

    this.newConfig.id = new Date().getTime();
    this.configs.push({ ...this.newConfig });
    this.syncConfigWithBackend();

    this.newConfig = { label: '', type: 'text', obligatoire: false, options: '' };
  }

  deleteConfig(id: number) {
    if (!confirm('Supprimer cette brique dynamique ?')) return;
    this.configs = this.configs.filter(c => c.id !== id);
    this.syncConfigWithBackend();
  }

  private syncConfigWithBackend() {
    const configJson = JSON.stringify(this.configs);
    if (this.backendConfig && this.backendConfig.id) {
      this.backendConfig.configJson = configJson;
      this.configService.update(this.backendConfig.id, this.backendConfig).subscribe({
        next: () => this.loadConfigs(),
        error: (err) => console.error('Erreur mise à jour config', err)
      });
    } else {
      const newBackendConfig: FicheAtelierConfigBackend = { configJson: configJson };
      this.configService.create(newBackendConfig).subscribe({
        next: () => this.loadConfigs(),
        error: (err) => console.error('Erreur création config', err)
      });
    }
  }
}
