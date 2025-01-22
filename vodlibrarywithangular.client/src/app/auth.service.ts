import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Register } from './models/register';
import { Login } from './models/login';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService
{

  private apiUrl = 'https://localhost:7156/api/auth';
  private tokenKey = 'authtokenkey';
  private authStatus = new BehaviorSubject(this.isAuthenticated());
  constructor(private httpClient : HttpClient) { }

  setLocalStorageToken(token : string)
  {
          localStorage.setItem(this.tokenKey, token);
          console.log("Initiating token!");

          this.authStatus.next(true);

  }

  getLocalStorageToken() : string | null
  {
      return localStorage.getItem(this.tokenKey);


  }

  clearLocalStorageToken()
  {
    localStorage.removeItem(this.tokenKey);
    this.authStatus.next(false);
  }

  isAuthenticated() : boolean
  {
      const value = this.getLocalStorageToken();

      return !!value
  }

  getAuthStatus() : Observable<boolean>
  {
      return this.authStatus.asObservable();
  }

  register(user : Register) : Observable<Register>
  {
    console.log(JSON.stringify(user));

      return this.httpClient.post<Register>(`${this.apiUrl}/register`, user)
      .pipe(catchError((error)=>
        {
          console.error("Registration failed",
          {
            message : error.message,
            status : error.status,
            error : error.error,
          });
          return throwError(()=>
          {
              new Error("Registration error");
          })
        }));



  }

  login(user : Login) : Observable<{token : string}>
  {
      return this.httpClient.post<{token : string}>(`${this.apiUrl}/login`, user)
      .pipe(catchError((error)=>
      {
          console.error("Login failed", error)
          return throwError(()=>
          {
              new Error("Login error");
          });
      }))
  }
}
