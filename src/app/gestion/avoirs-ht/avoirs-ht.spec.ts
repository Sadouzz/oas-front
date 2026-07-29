import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvoirsHt } from './avoirs-ht';

describe('AvoirsHt', () => {
  let component: AvoirsHt;
  let fixture: ComponentFixture<AvoirsHt>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvoirsHt]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvoirsHt);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
