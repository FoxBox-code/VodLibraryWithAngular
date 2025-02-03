import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavigationService
{
  routerAdress : BehaviorSubject<string> = new BehaviorSubject('/');
  constructor() { }

  getAdress() : Observable<string>
  {
     return this.routerAdress.asObservable();
  }

  updateAdress(navigation : string)
  {
    this.routerAdress.next(navigation);
  }
}
