import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FichesAtelier } from './fiches-atelier';

describe('FichesAtelier', () => {
  let component: FichesAtelier;
  let fixture: ComponentFixture<FichesAtelier>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FichesAtelier]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FichesAtelier);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
