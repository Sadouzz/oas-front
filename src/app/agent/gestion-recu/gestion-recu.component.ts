import { Component, inject, OnInit, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { LucideSearch, LucideReceipt, LucideEye, LucideTrash2, LucideCheck, LucideRefreshCw, LucidePlus, LucideX, LucideLoader2 } from '@lucide/angular';
import { RecuListItem, RecuPage } from './models/recu.model';
import { RecuService } from './recu.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { ConfirmationService } from '../../shared/components/confirmation/confirmation.service';
import { Observable, Subject, debounceTime, switchMap, of, catchError, map } from 'rxjs';
import { ClientService } from '../clients/client.service';
import { ClientListResponse } from '../clients/models/client-model';
import { extractContent } from '../../shared/models';

export type RecuOnglet = 'en-cours' | 'payes';

@Component({
  selector: 'app-gestion-recu',
  standalone: true,
  imports: [NgClass, LucideSearch, LucideReceipt, LucideEye, LucideTrash2, LucideCheck, LucideRefreshCw, LucidePlus, LucideX, LucideLoader2, PaginationComponent, AlertComponent],
  templateUrl: './gestion-recu.component.html'
})
export class GestionRecuComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private recuService = inject(RecuService);
  private confirmation = inject(ConfirmationService);
  private clientService = inject(ClientService);

  onglet: RecuOnglet = 'en-cours';
  recus: RecuListItem[] = [];
  loading = true;
  busyId: number | null = null;

  /** Page affichée, à partir de 1 (l'API commence à 0). */
  page = 1;
  totalPages = 0;
  totalElements = 0;
  readonly pageSize = 10;

  numeroRecuFilter: string | null = null;
  numeroClientFilter: string | null = null;

  successMessage = '';
  errorMessage = '';

  /* Nouveau reçu : choix du client (ancien add_recu_facture.php?numCl=…) */
  showAddModal = false;
  clientResults: ClientListResponse[] = [];
  clientSearching = false;
  clientKeyword = '';
  private clientSearch$ = new Subject<string>();

  ngOnInit() {
    this.clientSearch$.pipe(
      debounceTime(300),
      switchMap(keyword => {
        this.clientSearching = true;
        this.cdr.markForCheck();
        return this.clientService.getAll({ keyword: keyword || undefined, page: 0, size: 8 }).pipe(
          map(res => extractContent<ClientListResponse>(res)),
          catchError(() => of([] as ClientListResponse[]))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(clients => {
      this.clientResults = clients;
      this.clientSearching = false;
      this.cdr.markForCheck();
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(q => {
      const onglet: RecuOnglet = q.get('onglet') === 'payes' ? 'payes' : 'en-cours';
      if (onglet !== this.onglet || this.loading) {
        this.onglet = onglet;
        this.page = 1;
        this.load();
      }
      if (q.has('nouveau')) {
        this.openAddModal();
        this.router.navigate([], { relativeTo: this.route, queryParams: { onglet }, replaceUrl: true });
      }
    });
  }

  get enCours(): boolean { return this.onglet === 'en-cours'; }

  setOnglet(onglet: RecuOnglet) {
    if (onglet === this.onglet) return;
    this.router.navigate([], { relativeTo: this.route, queryParams: { onglet }, replaceUrl: true });
  }

  load() {
    this.loading = true;
    this.cdr.markForCheck();
    const params = {
      numeroRecu: this.numeroRecuFilter,
      numeroClient: this.numeroClientFilter,
      page: this.page - 1,
      size: this.pageSize,
    };
    const source: Observable<RecuPage<RecuListItem>> = this.enCours
      ? this.recuService.getEnCours(params)
      : this.recuService.getPayes(params);
    const ongletCharge = this.onglet;
    source.subscribe({
      next: res => {
        if (ongletCharge !== this.onglet) return;
        this.recus = res?.content ?? [];
        this.totalElements = res?.totalElements ?? this.recus.length;
        this.totalPages = res?.totalPages ?? 1;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        if (ongletCharge !== this.onglet) return;
        this.recus = [];
        this.totalElements = 0;
        this.totalPages = 0;
        this.loading = false;
        this.notifyError(this.errMsg(err, 'Impossible de charger les reçus.'));
      }
    });
  }

  onNumeroRecuInput(e: Event) { this.numeroRecuFilter = (e.target as HTMLInputElement).value.trim() || null; }
  onNumeroClientInput(e: Event) { this.numeroClientFilter = (e.target as HTMLInputElement).value.trim() || null; }

  search() {
    this.page = 1;
    this.load();
  }

  resetSearch(numeroInput: HTMLInputElement, clientInput: HTMLInputElement) {
    numeroInput.value = '';
    clientInput.value = '';
    this.numeroRecuFilter = null;
    this.numeroClientFilter = null;
    this.search();
  }

  get hasFilters(): boolean { return this.numeroRecuFilter !== null || this.numeroClientFilter !== null; }

  prevPage() { if (this.page > 1) { this.page--; this.load(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.load(); } }

  openAddModal() {
    this.showAddModal = true;
    this.clientKeyword = '';
    this.clientResults = [];
    this.clientSearch$.next('');
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  onClientKeyword(e: Event) {
    this.clientKeyword = (e.target as HTMLInputElement).value;
    this.clientSearch$.next(this.clientKeyword.trim());
  }

  /** Ouvre (ou crée) le reçu en cours du client choisi. */
  choisirClient(c: ClientListResponse) {
    this.showAddModal = false;
    this.router.navigate(['/app/gestion-recu/client', c.id]);
  }

  clientLabel(c: ClientListResponse): string {
    return c.raisonSociale || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username || `Client ${c.id}`;
  }

  ouvrir(r: RecuListItem) {
    this.router.navigate(['/app/gestion-recu', r.id]);
  }

  async supprimer(r: RecuListItem) {
    if (r.montantPaye > 0 || this.busyId !== null) return;
    const ok = await this.confirmation.confirm(
      `Supprimer le reçu n° ${r.numeroRecu} de ${r.nomClient || 'ce client'} ?`,
      { title: 'Supprimer le reçu', confirmLabel: 'Supprimer', danger: true }
    );
    if (!ok) return;
    this.busyId = r.id;
    this.cdr.markForCheck();
    this.recuService.supprimer(r.id).subscribe({
      next: () => {
        this.busyId = null;
        this.notify(`Reçu n° ${r.numeroRecu} supprimé.`);
        if (this.recus.length === 1 && this.page > 1) this.page--;
        this.load();
      },
      error: err => {
        this.busyId = null;
        this.notifyError(this.errMsg(err, 'Erreur lors de la suppression du reçu.'));
      }
    });
  }

  async valider(r: RecuListItem) {
    if (r.valide || this.busyId !== null) return;
    const ok = await this.confirmation.confirm(
      `Valider le reçu n° ${r.numeroRecu} de ${r.nomClient || 'ce client'} ? La validation ne peut être faite qu'une fois.`,
      { title: 'Valider le reçu', confirmLabel: 'Valider' }
    );
    if (!ok) return;
    this.busyId = r.id;
    this.cdr.markForCheck();
    this.recuService.valider(r.id).subscribe({
      next: detail => {
        this.busyId = null;
        r.valide = detail?.valide ?? true;
        this.notify(`Reçu n° ${r.numeroRecu} validé.`);
      },
      error: err => {
        this.busyId = null;
        this.notifyError(this.errMsg(err, 'Erreur lors de la validation du reçu.'));
      }
    });
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  fmt(n: number | null | undefined): string { return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n ?? 0); }

  private errMsg(err: any, fallback: string): string {
    return err?.error?.message || (typeof err?.error === 'string' ? err.error : '') || fallback;
  }

  private notify(msg: string) {
    this.successMessage = msg;
    this.cdr.markForCheck();
    setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 3500);
  }

  private notifyError(msg: string) {
    this.errorMessage = msg;
    this.cdr.markForCheck();
    setTimeout(() => { this.errorMessage = ''; this.cdr.markForCheck(); }, 5000);
  }
}
