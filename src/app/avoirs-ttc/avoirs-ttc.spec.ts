import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvoirsTtc } from './avoirs-ttc';

describe('AvoirsTtc', () => {
  let component: AvoirsTtc;
  let fixture: ComponentFixture<AvoirsTtc>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvoirsTtc]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvoirsTtc);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
