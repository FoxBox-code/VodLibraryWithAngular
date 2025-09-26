import { TestBed } from '@angular/core/testing';

import { UploadVideoService } from '../services/upload-video.service';

describe('UploadVideoService', () => {
  let service: UploadVideoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UploadVideoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
