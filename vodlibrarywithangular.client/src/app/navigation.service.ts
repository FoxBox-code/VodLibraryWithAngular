import { Injectable } from '@angular/core';
import { Params } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavigationService
{
  routerAdress : BehaviorSubject<{path : any[], queryParams? : Params}> = new BehaviorSubject({path : ['/']});
  constructor() { }

  getAdress() : Observable<{path : any[], queryParams? : Params}>
  {
     return this.routerAdress.asObservable();
  }

  updateAdress(router : {path : any[], queryParams? : Params})
  {
    this.routerAdress.next(router);
  }
}
