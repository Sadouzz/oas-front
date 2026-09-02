import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeuilAlertes } from './seuil-alertes';

describe('SeuilAlertes', () => {
  let component: SeuilAlertes;
  let fixture: ComponentFixture<SeuilAlertes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeuilAlertes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeuilAlertes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
