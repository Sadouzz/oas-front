import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.css',
})
export class PublicLayout implements AfterViewInit {
  @ViewChild('footer') footerRef!: ElementRef;
  footerHeight = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    // Timeout to ensure rendering is complete before measuring
    setTimeout(() => this.updateFooterHeight(), 0);
  }

  @HostListener('window:resize')
  onResize() {
    this.updateFooterHeight();
  }

  updateFooterHeight() {
    if (this.footerRef) {
      this.footerHeight = this.footerRef.nativeElement.offsetHeight;
      this.cdr.detectChanges();
    }
  }
}
