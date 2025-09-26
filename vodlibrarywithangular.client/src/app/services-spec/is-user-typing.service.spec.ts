import { TestBed } from '@angular/core/testing';

import { IsUserTypingService } from '../services/is-user-typing.service';

describe('IsUserTypingService', () => {
  let service: IsUserTypingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IsUserTypingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
