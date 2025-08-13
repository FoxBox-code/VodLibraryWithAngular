import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenreVidoesComponent } from './genre-vidoes.component';

describe('GenreVidoesComponent', () => {
  let component: GenreVidoesComponent;
  let fixture: ComponentFixture<GenreVidoesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GenreVidoesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenreVidoesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
