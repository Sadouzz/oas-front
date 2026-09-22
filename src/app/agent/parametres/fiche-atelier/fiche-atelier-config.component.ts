import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FicheAtelierConfigService } from '../../fiches-atelier/fiche-atelier-config.service';
import { FicheAtelierService } from '../../fiches-atelier/fiche-atelier.service';
import { OrdreReparationService } from '../../ordres-reparation/ordre-reparation.service';
import {
  BriqueConfig,
  FicheAtelierConfigBackend,
  FicheAtelierConfigItem,
  DEFAULT_LIGNES_RECEPTION,
  DEFAULT_RUBRIQUES_DEFAUTS,
  parseFicheAtelierConfig,
  FicheAtelierDetailsResponse,
  extractContent
} from '../../../shared/models';
import {
  LucidePlus,
  LucideTrash2,
  LucideRotateCcw,
  LucideCheck,
  LucideClipboardList,
  LucideAlertTriangle,
  LucideLayers,
  LucideArchive,
  LucideArchiveRestore,
  LucideLock
} from '@lucide/angular';

@Component({
  selector: 'app-fiche-atelier-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucidePlus,
    LucideTrash2,
    LucideRotateCcw,
    LucideCheck,
    LucideClipboardList,
    LucideAlertTriangle,
    LucideLayers,
    LucideArchive,
    LucideArchiveRestore,
    LucideLock
  ],
  templateUrl: './fiche-atelier-config.component.html'
})
export class FicheAtelierConfigComponent implements OnInit {
  private configService = inject(FicheAtelierConfigService);
  private ficheService = inject(FicheAtelierService);
  private ordreService = inject(OrdreReparationService);
  private cdr = inject(ChangeDetectorRef);

  backendConfig: FicheAtelierConfigBackend | null = null;
  isLoading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  activeTab: 'reception' | 'defauts' | 'briques' = 'reception';

  // Filtres d'affichage
  filterReceptionStatus: 'ALL' | 'ACTIVE' | 'ARCHIVED' = 'ALL';
  filterDefautsStatus: 'ALL' | 'ACTIVE' | 'ARCHIVED' = 'ALL';

  // 1. Lignes Réception
  lignesReception: FicheAtelierConfigItem[] = DEFAULT_LIGNES_RECEPTION.map(nom => ({ nom, archive: false }));
  newLigneReception = '';

  // 2. Rubriques Défauts constatés
  rubriquesDefauts: FicheAtelierConfigItem[] = DEFAULT_RUBRIQUES_DEFAUTS.map(nom => ({ nom, archive: false }));
  newRubriqueDefaut = '';

  // 3. Briques dynamiques supplémentaires
  configs: BriqueConfig[] = [];
  newConfig: BriqueConfig = { label: '', type: 'text', obligatoire: false, options: '' };

  // Cartographie des usages dans les fiches existantes et ordres de travail
  private receptionUsageMap: Map<string, number> = new Map();
  private defautUsageMap: Map<string, number> = new Map();
  private rawOrdreDefautTexts: string[] = [];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.loadUsageData();
    this.loadConfigs();
  }

  private scanOrdreDefauts() {
    for (const defText of this.rawOrdreDefautTexts) {
      for (const r of this.rubriquesDefauts) {
        if (r.nom && defText.includes(r.nom.trim().toLowerCase())) {
          const k = r.nom.trim().toLowerCase();
          this.defautUsageMap.set(k, (this.defautUsageMap.get(k) || 0) + 1);
        }
      }
    }
  }

  private loadUsageData() {
    // 1. Analyser les Fiches Atelier existantes
    this.ficheService.getAll({ size: 1000 }).subscribe({
      next: (data) => {
        const fiches = extractContent<FicheAtelierDetailsResponse>(data);
        for (const f of fiches) {
          if (Array.isArray(f.lignesReception)) {
            for (const lr of f.lignesReception) {
              if (lr?.nom) {
                const k = lr.nom.trim().toLowerCase();
                this.receptionUsageMap.set(k, (this.receptionUsageMap.get(k) || 0) + 1);
              }
            }
          }
          if (Array.isArray(f.lignesDefauts)) {
            for (const ld of f.lignesDefauts) {
              if (ld?.nom) {
                const k = ld.nom.trim().toLowerCase();
                this.defautUsageMap.set(k, (this.defautUsageMap.get(k) || 0) + 1);
              }
            }
          }
        }
        this.cdr.markForCheck();
      },
      error: (e) => console.warn('Could not check fiches usage', e)
    });

    // 2. Analyser les Ordres de Réparation existants
    this.ordreService.getAll({ size: 1000 }).subscribe({
      next: (data) => {
        const ordres = extractContent<any>(data);
        for (const o of ordres) {
          if (Array.isArray(o.lignesReception)) {
            for (const lr of o.lignesReception) {
              if (lr?.nom) {
                const k = lr.nom.trim().toLowerCase();
                this.receptionUsageMap.set(k, (this.receptionUsageMap.get(k) || 0) + 1);
              }
            }
          }
          if (o.listeDefauts && typeof o.listeDefauts === 'string') {
            this.rawOrdreDefautTexts.push(o.listeDefauts.toLowerCase());
          }
          if (o.diagnostic?.pannesDetectees && typeof o.diagnostic.pannesDetectees === 'string') {
            this.rawOrdreDefautTexts.push(o.diagnostic.pannesDetectees.toLowerCase());
          }
        }
        this.scanOrdreDefauts();
        this.cdr.markForCheck();
      },
      error: (e) => console.warn('Could not check ordres usage', e)
    });
  }

  loadConfigs() {
    this.configService.getAll().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.backendConfig = data[0];
          const full = parseFicheAtelierConfig(this.backendConfig.configJson);
          this.lignesReception = full.lignesReception;
          this.rubriquesDefauts = full.rubriquesDefauts;
          this.configs = full.briques;
        } else {
          this.backendConfig = null;
          this.lignesReception = DEFAULT_LIGNES_RECEPTION.map(nom => ({ nom, archive: false }));
          this.rubriquesDefauts = DEFAULT_RUBRIQUES_DEFAUTS.map(nom => ({ nom, archive: false }));
          this.configs = [];
        }
        this.scanOrdreDefauts();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement configuration fiche atelier', err);
        this.errorMessage = 'Impossible de charger la configuration.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Usages ────────────────────────────────────────────────────
  getReceptionUsageCount(nom: string): number {
    return this.receptionUsageMap.get(nom.trim().toLowerCase()) || 0;
  }

  isReceptionUsed(nom: string): boolean {
    return this.getReceptionUsageCount(nom) > 0;
  }

  getDefautUsageCount(nom: string): number {
    return this.defautUsageMap.get(nom.trim().toLowerCase()) || 0;
  }

  isDefautUsed(nom: string): boolean {
    return this.getDefautUsageCount(nom) > 0;
  }

  // ─── Getters filtrés ───────────────────────────────────────────
  get filteredLignesReception(): { item: FicheAtelierConfigItem; originalIndex: number }[] {
    return this.lignesReception
      .map((item, index) => ({ item, originalIndex: index }))
      .filter(({ item }) => {
        if (this.filterReceptionStatus === 'ACTIVE') return !item.archive;
        if (this.filterReceptionStatus === 'ARCHIVED') return !!item.archive;
        return true;
      });
  }

  get activeReceptionCount(): number {
    return this.lignesReception.filter(i => !i.archive).length;
  }

  get archivedReceptionCount(): number {
    return this.lignesReception.filter(i => !!i.archive).length;
  }

  get filteredRubriquesDefauts(): { item: FicheAtelierConfigItem; originalIndex: number }[] {
    return this.rubriquesDefauts
      .map((item, index) => ({ item, originalIndex: index }))
      .filter(({ item }) => {
        if (this.filterDefautsStatus === 'ACTIVE') return !item.archive;
        if (this.filterDefautsStatus === 'ARCHIVED') return !!item.archive;
        return true;
      });
  }

  get activeDefautsCount(): number {
    return this.rubriquesDefauts.filter(i => !i.archive).length;
  }

  get archivedDefautsCount(): number {
    return this.rubriquesDefauts.filter(i => !!i.archive).length;
  }

  // ─── Lignes Réception ──────────────────────────────────────────
  addLigneReception() {
    const val = this.newLigneReception.trim();
    if (!val) return;
    const existing = this.lignesReception.find(i => i.nom.toLowerCase() === val.toLowerCase());
    if (existing) {
      if (existing.archive) {
        existing.archive = false;
        this.newLigneReception = '';
        this.syncConfigWithBackend(`Le point « ${existing.nom} » a été réactivé.`);
        return;
      }
      this.errorMessage = 'Cette ligne de réception existe déjà.';
      return;
    }
    this.lignesReception.push({ nom: val, archive: false });
    this.newLigneReception = '';
    this.syncConfigWithBackend('Ligne de réception ajoutée avec succès.');
  }

  archiveLigneReception(index: number, archive: boolean) {
    const item = this.lignesReception[index];
    if (!item) return;
    item.archive = archive;
    const action = archive ? 'archivé (il ne sera plus proposé sur les nouvelles fiches)' : 'restauré et réactivé';
    this.syncConfigWithBackend(`Point de réception « ${item.nom} » ${action}.`);
  }

  removeLigneReception(index: number) {
    const item = this.lignesReception[index];
    if (!item) return;

    const count = this.getReceptionUsageCount(item.nom);
    if (count > 0) {
      this.errorMessage = `Impossible de supprimer « ${item.nom} » car il est déjà utilisé dans ${count} fiche(s) ou ordre(s) de travail. La suppression est interdite pour préserver les données historiques. Vous pouvez uniquement l'archiver.`;
      return;
    }

    if (!confirm(`Supprimer définitivement le point de contrôle « ${item.nom} » ? (Cet élément n'a jamais été utilisé)`)) return;
    this.lignesReception.splice(index, 1);
    this.syncConfigWithBackend(`Point de réception « ${item.nom} » supprimé.`);
  }

  resetLignesReception() {
    if (!confirm('Réactiver les points de réception par défaut ? Vos points personnalisés déjà utilisés seront scrupuleusement conservés.')) return;

    for (const defNom of DEFAULT_LIGNES_RECEPTION) {
      const existing = this.lignesReception.find(i => i.nom.toLowerCase() === defNom.toLowerCase());
      if (existing) {
        existing.archive = false;
      } else {
        this.lignesReception.push({ nom: defNom, archive: false });
      }
    }

    // Seuls les points JAMAIS utilisés et absents de la liste par défaut peuvent être retirés
    this.lignesReception = this.lignesReception.filter(i => {
      const isDef = DEFAULT_LIGNES_RECEPTION.some(d => d.toLowerCase() === i.nom.toLowerCase());
      const isUsed = this.isReceptionUsed(i.nom);
      return isDef || isUsed;
    });

    this.syncConfigWithBackend('Points de réception par défaut rétablis (éléments utilisés conservés).');
  }

  // ─── Rubriques Défauts constatés ───────────────────────────────
  addRubriqueDefaut() {
    const val = this.newRubriqueDefaut.trim();
    if (!val) return;
    const existing = this.rubriquesDefauts.find(i => i.nom.toLowerCase() === val.toLowerCase());
    if (existing) {
      if (existing.archive) {
        existing.archive = false;
        this.newRubriqueDefaut = '';
        this.syncConfigWithBackend(`La rubrique « ${existing.nom} » a été réactivée.`);
        return;
      }
      this.errorMessage = 'Cette rubrique de défaut existe déjà.';
      return;
    }
    this.rubriquesDefauts.push({ nom: val, archive: false });
    this.newRubriqueDefaut = '';
    this.syncConfigWithBackend('Rubrique de défauts ajoutée avec succès.');
  }

  archiveRubriqueDefaut(index: number, archive: boolean) {
    const item = this.rubriquesDefauts[index];
    if (!item) return;
    item.archive = archive;
    const action = archive ? 'archivée (elle ne sera plus proposée sur les nouvelles fiches)' : 'restaurée et réactivée';
    this.syncConfigWithBackend(`Rubrique de défaut « ${item.nom} » ${action}.`);
  }

  removeRubriqueDefaut(index: number) {
    const item = this.rubriquesDefauts[index];
    if (!item) return;

    const count = this.getDefautUsageCount(item.nom);
    if (count > 0) {
      this.errorMessage = `Impossible de supprimer « ${item.nom} » car cette rubrique est déjà utilisée dans ${count} fiche(s) ou ordre(s) de travail. La suppression est interdite pour préserver les données historiques. Vous pouvez uniquement l'archiver.`;
      return;
    }

    if (!confirm(`Supprimer définitivement la rubrique de défaut « ${item.nom} » ? (Cette rubrique n'a jamais été utilisée)`)) return;
    this.rubriquesDefauts.splice(index, 1);
    this.syncConfigWithBackend(`Rubrique de défaut « ${item.nom} » supprimée.`);
  }

  resetRubriquesDefauts() {
    if (!confirm('Réactiver les rubriques par défaut ? Vos rubriques déjà utilisées seront scrupuleusement conservées.')) return;

    for (const defNom of DEFAULT_RUBRIQUES_DEFAUTS) {
      const existing = this.rubriquesDefauts.find(i => i.nom.toLowerCase() === defNom.toLowerCase());
      if (existing) {
        existing.archive = false;
      } else {
        this.rubriquesDefauts.push({ nom: defNom, archive: false });
      }
    }

    this.rubriquesDefauts = this.rubriquesDefauts.filter(i => {
      const isDef = DEFAULT_RUBRIQUES_DEFAUTS.some(d => d.toLowerCase() === i.nom.toLowerCase());
      const isUsed = this.isDefautUsed(i.nom);
      return isDef || isUsed;
    });

    this.syncConfigWithBackend('Rubriques de défauts par défaut rétablies (éléments utilisés conservés).');
  }

  // ─── Briques dynamiques ─────────────────────────────────────────
  saveConfig() {
    if (!this.newConfig.label?.trim() || !this.newConfig.type) return;

    this.newConfig.id = new Date().getTime();
    this.configs.push({ ...this.newConfig });
    this.syncConfigWithBackend('Brique dynamique ajoutée avec succès.');
    this.newConfig = { label: '', type: 'text', obligatoire: false, options: '' };
  }

  deleteConfig(id: number) {
    if (!confirm('Supprimer cette brique dynamique ?')) return;
    this.configs = this.configs.filter(c => c.id !== id);
    this.syncConfigWithBackend('Brique dynamique supprimée.');
  }

  // ─── Synchronisation Backend ───────────────────────────────────
  private syncConfigWithBackend(successNotice?: string) {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payloadObj = {
      lignesReception: this.lignesReception,
      rubriquesDefauts: this.rubriquesDefauts,
      briques: this.configs
    };

    const configJson = JSON.stringify(payloadObj);

    if (this.backendConfig && this.backendConfig.id) {
      this.backendConfig.configJson = configJson;
      this.configService.update(this.backendConfig.id, this.backendConfig).subscribe({
        next: (res) => {
          this.backendConfig = res;
          this.saving = false;
          this.showSuccess(successNotice || 'Configuration enregistrée avec succès.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Erreur mise à jour config', err);
          this.errorMessage = 'Erreur lors de la sauvegarde de la configuration.';
          this.saving = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      const newBackendConfig: FicheAtelierConfigBackend = { configJson: configJson };
      this.configService.create(newBackendConfig).subscribe({
        next: (res) => {
          this.backendConfig = res;
          this.saving = false;
          this.showSuccess(successNotice || 'Configuration créée avec succès.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Erreur création config', err);
          this.errorMessage = 'Erreur lors de la sauvegarde de la configuration.';
          this.saving = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    setTimeout(() => {
      if (this.successMessage === msg) {
        this.successMessage = '';
        this.cdr.markForCheck();
      }
    }, 4000);
  }
}
