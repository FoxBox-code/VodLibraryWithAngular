import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, catchError, switchMap, throwError } from 'rxjs';
import { Register } from './models/register';
import { Login } from './models/login';
import { BehaviorSubject } from 'rxjs';
import {jwtDecode} from 'jwt-decode';
import { ApiUrls } from './api-URLS';
import { WatchHistoryVideoInfo } from './models/watch-history-video-info';



@Injectable({
  providedIn: 'root'
})
export class AuthService
{


  private tokenKey = 'authtokenkey';
  private authStatus = new BehaviorSubject(this.isAuthenticated());
  private userName = new BehaviorSubject(this.getUserNameFromToken());
  private logOutEvent = new Subject<void>();
  public logout$ = this.logOutEvent.asObservable();
  public userTodayWatchHistorySubject = new BehaviorSubject<WatchHistoryVideoInfo[]>([]);
  public userTodayWatchHistory$ = this.userTodayWatchHistorySubject.asObservable();
  constructor(private httpClient : HttpClient,) { }

  setLocalStorageToken(token : string)
  {
          localStorage.setItem(this.tokenKey, token);
          console.log("Initiating token!");

          this.authStatus.next(true);
          this.userName.next(this.getUserNameFromToken());

  }

  getLocalStorageToken() : string | null
  {
      return localStorage.getItem(this.tokenKey);


  }

  clearLocalStorageToken()
  {
    console.log(`${this.getUserNameFromToken()} has loged off`);
    localStorage.removeItem(this.tokenKey);
    this.authStatus.next(false);
    this.userName.next(this.getUserNameFromToken());
    this.logOutEvent.next();
    this.userTodayWatchHistorySubject.next([]);


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

      return this.httpClient.post<Register>(`${ApiUrls.REGISTER}`, user)
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
      return this.httpClient.post<{token : string}>(`${ApiUrls.LOGIN}`, user)
      .pipe(catchError((error)=>
      {
          console.error("Login failed", error)
          return throwError(()=>
          {
              new Error("Login error");
          });
      }))

  }





  getUserNameFromToken() : string | null
  {
    const token = this.getLocalStorageToken();

    if(!token)
      {
        return null;
      }

      const decodedToken: any = jwtDecode(token);
      const userName = decodedToken.unique_name ;


      return userName;

  }

  getUserNameAsOservable() : Observable<string | null>
  {
    return this.userName.asObservable();
  }

  getUserTodaysWatchHistory() : Observable<WatchHistoryVideoInfo[]>
  {
    const token = this.getLocalStorageToken();
        const headers = new HttpHeaders
        (
          {
            Authorization : `Bearer ${token}`
          }
        )
    return this.httpClient.get<WatchHistoryVideoInfo[]>(`${ApiUrls.GETUSERHISTORYFORTODAY}`,{headers})
  }

  getUserPastTodaysWatchHistory() : Observable<WatchHistoryVideoInfo[][]>
  {
    const token = this.getLocalStorageToken();
        const headers = new HttpHeaders
        (
          {
            Authorization : `Bearer ${token}`
          }
        )
    return this.httpClient.get<WatchHistoryVideoInfo[][]>(`${ApiUrls.GETUSERHISTORYPASTTODAY}`, {headers})
  }

  deleteUserWatchHistory() : Observable<{message : string}>
  {
    const token = this.getLocalStorageToken();
        const headers = new HttpHeaders
        (
          {
            Authorization : `Bearer ${token}`
          }
        )

       return this.httpClient.delete<{message : string}>(`${ApiUrls.DELETEUSERWATCHHISTORYALL}`, {headers})
  }

  deleteUserIndivudalVideoRecord(primaryKeyId : number) : Observable<{message : string}>
  {
      const token = this.getLocalStorageToken();
        const headers = new HttpHeaders
        (
          {
            Authorization : `Bearer ${token}`
          }
        )

        return this.httpClient.delete<{message : string}>(`${ApiUrls.HISTORY}/${primaryKeyId}`, {headers})
  }


}
