import { TestBed } from '@angular/core/testing';

import { CustomVideoPlayerService } from './custom-video-player.service';

describe('CustomVideoPlayerService', () => {
  let service: CustomVideoPlayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomVideoPlayerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
