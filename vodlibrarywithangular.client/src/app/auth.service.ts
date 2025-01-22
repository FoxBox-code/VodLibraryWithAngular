import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Register } from './models/register';
import { Login } from './models/login';

@Injectable({
  providedIn: 'root'
})
export class AuthService
{

  private apiUrl = 'https://localhost:7156/api/auth';
  constructor(private httpClient : HttpClient) { }


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

  login(user : Login) : Observable<Login>
  {
      return this.httpClient.post<Login>(`${this.apiUrl}/login`, user)
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
