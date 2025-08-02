import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoCatalogComponent } from './video-catalog.component';

describe('VideoCatalogComponent', () => {
  let component: VideoCatalogComponent;
  let fixture: ComponentFixture<VideoCatalogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VideoCatalogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoCatalogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
