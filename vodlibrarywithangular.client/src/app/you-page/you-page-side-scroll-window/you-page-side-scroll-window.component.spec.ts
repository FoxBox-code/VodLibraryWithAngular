import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YouPageSideScrollWindowComponent } from './you-page-side-scroll-window.component';

describe('YouPageSideScrollWindowComponent', () => {
  let component: YouPageSideScrollWindowComponent;
  let fixture: ComponentFixture<YouPageSideScrollWindowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [YouPageSideScrollWindowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(YouPageSideScrollWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
