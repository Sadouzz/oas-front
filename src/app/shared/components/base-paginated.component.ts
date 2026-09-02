import { Directive } from '@angular/core';
import { PageParams } from '../models/page-params.model';
import { extractContent } from '../models/api-response.model';

@Directive()
export abstract class BasePaginatedComponent {
  page = 1;
  readonly pageSize = 10;
  totalElements = 0;
  serverTotalPages = 1;
  searchTerm = '';

  get totalPages(): number {
    return this.serverTotalPages;
  }

  /**
   * Méthode à implémenter par l'enfant pour recharger les données 
   * (doit utiliser this.getPageParams() et this.applyPageResponse(res))
   */
  abstract loadData(): void;

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.page = 1;
    this.loadData();
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadData();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadData();
    }
  }

  protected getPageParams(extraParams: Record<string, any> = {}): PageParams {
    const p: PageParams = { page: this.page - 1, size: this.pageSize };
    if (this.searchTerm) p.keyword = this.searchTerm;
    return { ...p, ...extraParams };
  }

  protected applyPageResponse<T>(res: any): T[] {
    const content = extractContent<T>(res);
    if (res && res.totalElements !== undefined) {
      this.totalElements = res.totalElements;
      this.serverTotalPages = res.totalPages;
    } else {
      this.totalElements = content.length;
      this.serverTotalPages = 1;
    }
    return content;
  }
}
