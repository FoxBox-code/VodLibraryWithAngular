import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable, Subject, catchError, switchMap, throwError, timestamp } from 'rxjs';
import { Register } from './models/register';
import { Login } from './models/login';
import { BehaviorSubject } from 'rxjs';
import {jwtDecode} from 'jwt-decode';
import { ApiUrls } from './api-URLS';
import { WatchHistoryVideoInfo } from './models/watch-history-video-info';
import { ProfilesFollowingDTO } from './models/profiles-followingDTO';



@Injectable({
  providedIn: 'root'
})
export class AuthService
{


  private tokenKey = 'authtokenkey';
  private authStatus = new BehaviorSubject(this.isAuthenticated());
  private userName = new BehaviorSubject(this.getUserNameFromToken());
  private userIdSubject = new BehaviorSubject(this.getUserIdFromToken());
  private logOutEvent = new Subject<void>();
  public logout$ = this.logOutEvent.asObservable();
  public userTodayWatchHistorySubject = new BehaviorSubject<WatchHistoryVideoInfo[]>([]);
  public userTodayWatchHistory$ = this.userTodayWatchHistorySubject.asObservable();

  private userFollowingSubject = new BehaviorSubject<ProfilesFollowingDTO[] | null>(null);
  public userFollowing$ = this.userFollowingSubject.asObservable();

  constructor(private httpClient : HttpClient,) { }

  setLocalStorageToken(token : string)
  {
          localStorage.setItem(this.tokenKey, token);
          console.log("Initiating token!");

          this.authStatus.next(true);
          this.userName.next(this.getUserNameFromToken());
          this.userIdSubject.next(this.getUserIdFromToken());

          this.checkTokenExpiration();
  }






  getLocalStorageToken() : string | null
  {
      return localStorage.getItem(this.tokenKey);


  }

  checkTokenExpiration() : boolean
  {
    const token = this.getLocalStorageToken();
    if(token === null)
    {
      return false;
    }
    const atop = atob(token.split('.')[1])
    const atopToJson = JSON.parse(atop);

    const timeNow = Date.now();
    const tokenExpiresTimeToMs = atopToJson.exp * 1000;

    setTimeout(() => {
      this.clearLocalStorageToken();
    }, tokenExpiresTimeToMs - timeNow);

    if(tokenExpiresTimeToMs > timeNow)
    {
      return true;
    }
    else
      return false;

  }



  clearLocalStorageToken()
  {
    console.log(`${this.getUserNameFromToken()} has loged off`);
    localStorage.removeItem(this.tokenKey);
    this.authStatus.next(false);
    this.userName.next(this.getUserNameFromToken());
    this.userIdSubject.next(this.getUserIdFromToken());
    this.logOutEvent.next();
    this.userTodayWatchHistorySubject.next([]);
    this.userFollowingSubject.next(null);
    sessionStorage.removeItem('userFollowing');

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

  

  register(form : FormData) : Observable<Register>
  {

      return this.httpClient.post<Register>(`${ApiUrls.REGISTER}`, form)

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

  getUserIdFromToken() : string | null
  {
    const token = this.getLocalStorageToken();

    if(!token)
      return null;

    const decodeToken : any = jwtDecode(token);
    const userId = decodeToken.nameid;

    return userId;
  }

  getUserNameAsOservable() : Observable<string | null>
  {
    return this.userName.asObservable();
  }

  getUserIdAsObservable() : Observable<string | null>
  {
    return this.userIdSubject.asObservable();
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

  getUserFollowing() : Observable<ProfilesFollowingDTO[]>
  {
    const headers = this.getHttpHeaders();

    return this.httpClient.get<ProfilesFollowingDTO[]>(`${ApiUrls.VIDEO}/subscribers`, {headers})


  }

  public getHttpHeaders() : HttpHeaders
  {
    const token = this.getLocalStorageToken();
    const headers = new HttpHeaders
    (
      {
        Authorization : `Bearer ${token}`
      }
    )

    return headers;
  }

  public updateSubjectForUserFollowing(following :  ProfilesFollowingDTO[])
  {
      this.userFollowingSubject.next(following);
  }

  Cock()
  {
    return this.httpClient.get(`${ApiUrls.BASE}/auth/cock`);
  }


}
