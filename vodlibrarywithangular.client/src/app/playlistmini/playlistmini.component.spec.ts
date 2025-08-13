import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaylistminiComponent } from './playlistmini.component';

describe('PlaylistminiComponent', () => {
  let component: PlaylistminiComponent;
  let fixture: ComponentFixture<PlaylistminiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PlaylistminiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaylistminiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
