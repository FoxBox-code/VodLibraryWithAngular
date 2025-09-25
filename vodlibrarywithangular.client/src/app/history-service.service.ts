import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { VideoWindow } from './models/video-window';
import { ApiUrls } from './api-URLS';
import { WatchHistoryVideoInfo } from './models/watch-history-video-info';

@Injectable({
  providedIn: 'root'
})
export class HistoryService
{

  constructor(private httpClient : HttpClient, private authService : AuthService,)
  {

  }

  getUserLikedHistory(take? : number) : Observable<VideoWindow[]>
    {
      const token = this.authService.getLocalStorageToken();
      const headers = this.authService.getHttpHeaders();


      const params = new HttpParams();

      if(take)
        params.set('take', take);

      return this.httpClient.get<VideoWindow[]>(`${ApiUrls.LIKEDVIDEOS}`, {headers, params});
    }

    deleteLikedVideoFromHistory(videoId : number) : Observable<{message : string}>
    {

      const headers = this.authService.getHttpHeaders();
        return this.httpClient.delete<{message : string}>(`${ApiUrls.LIKEDVIDEOS}/${videoId}`,{headers})
    }

    addVideoToUsersWatchHistory(videoId : number) : Observable<WatchHistoryVideoInfo>
    {

      const headers = this.authService.getHttpHeaders();



      return this.httpClient.post<WatchHistoryVideoInfo>(`${ApiUrls.HISTORY_CONTROLLER}/${videoId}`,null,{headers});
    }

    getUserHistoryForYouPage() : Observable<VideoWindow[]>
  {
      const headers = this.authService.getHttpHeaders();

      return this.httpClient.get<VideoWindow[]>(`${ApiUrls.HISTORY_CONTROLLER}/you`, {headers})
  }


  getUserWatchHistoryForToday() : Observable<WatchHistoryVideoInfo[]>
    {

          const headers = this.authService.getHttpHeaders();
      return this.httpClient.get<WatchHistoryVideoInfo[]>(`${ApiUrls.GETUSERHISTORYFORTODAY}`,{headers})
    }

    getUserWatchHistoryPastToday() : Observable<WatchHistoryVideoInfo[][]>
    {

          const headers = this.authService.getHttpHeaders();
      return this.httpClient.get<WatchHistoryVideoInfo[][]>(`${ApiUrls.GETUSERHISTORYPASTTODAY}`, {headers})
    }

    deleteUserWatchHistoryAll() : Observable<{message : string}>
    {

          const headers = this.authService.getHttpHeaders();

         return this.httpClient.delete<{message : string}>(`${ApiUrls.DELETEUSERWATCHHISTORYALL}`, {headers})
    }

    deleteIndividualVideoRecord(primaryKeyId : number) : Observable<{message : string}>
    {

          const headers = this.authService.getHttpHeaders();

          return this.httpClient.delete<{message : string}>(`${ApiUrls.DELETEINDIVIDUALVIDEORECORD}/${primaryKeyId}`, {headers})
    }


}
