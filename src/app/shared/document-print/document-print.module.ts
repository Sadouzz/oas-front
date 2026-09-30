import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentPrintComponent } from './document-print.component';
import { DevisPrevisionnelPrintComponent } from './devis-previsionnel/devis-previsionnel-print.component';
import { ProformaPrintComponent } from './proforma/proforma-print.component';
import { DocumentViewerComponent } from './viewer/document-viewer.component';

@NgModule({
  imports: [
    CommonModule,
    DocumentPrintComponent,
    DevisPrevisionnelPrintComponent,
    ProformaPrintComponent,
    DocumentViewerComponent
  ],
  exports: [
    DocumentPrintComponent,
    DevisPrevisionnelPrintComponent,
    ProformaPrintComponent,
    DocumentViewerComponent
  ]
})
export class DocumentPrintModule {}

