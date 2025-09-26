import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IsUserTypingService
{
  isUserInTypingField : boolean = false;
  isUserInTypingFieldSubject = new BehaviorSubject<boolean>(false);
  constructor() { }
}
