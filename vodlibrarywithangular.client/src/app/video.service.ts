import { Injectable,inject } from '@angular/core';
import { BehaviorSubject, Observable, retry } from 'rxjs';
import { Category } from './models/category';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams, HttpParamsOptions, HttpRequest } from '@angular/common/http';
import { ApiUrls } from './api-URLS';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { CategoryWithVideos } from './models/category-with-videos';
import { PlayVideo } from './models/play-video';
import { VideoComment } from './models/videoComment';

import { Reaction } from './models/reaction';

import { VideoWindow } from './models/video-window';
import { WatchHistoryVideoInfo } from './models/watch-history-video-info';
import { FormGroup } from '@angular/forms';
import { EditVideoFormControls } from './models/EditVideoFormControls';
import { SubscribingDTO } from './models/subscribingDTO';
import { VideoLikeDislikeCountDTO } from './models/video-like-dislike-countDTO';
import { CategoryStatsDTO } from './models/categorystatsDTO';
import { UploadServerMessageResponse } from './models/uploadServerMessageResponse';


@Injectable({
  providedIn: 'root'
})
export class VideoService
{
  constructor(private httpClient : HttpClient, private authService : AuthService)
  {

  }

  private commentsCountSubject = new BehaviorSubject<number>(0);
  commentsCount$ = this.commentsCountSubject.asObservable();

  public videoCommentsSubject = new BehaviorSubject<VideoComment[]>([]);
  videoComment$ = this.videoCommentsSubject.asObservable();

  private viewsSubject = new BehaviorSubject<number>(0);
  views$ = this.viewsSubject.asObservable();







  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$ = this.categoriesSubject.asObservable();

  private selectedVideoSubcjet = new BehaviorSubject<VideoWindow | null>(null);
  public  selectedVideo$ = this.selectedVideoSubcjet.asObservable();

  private userVideoReactionSubect = new BehaviorSubject<Reaction | null>(null);
  public userVideoReaction$ = this.userVideoReactionSubect.asObservable();



  getCategorys() : Observable <Category[]>
  {
    return this.httpClient.get<Category[]>(`${ApiUrls.CATEGORIES}`)
    .pipe(catchError((error)=>
      {
        console.error(
        {
            message : error.message,
            status : error.status,
            error : error.error
        });

        return throwError(()=>
        {
              new Error("Failed to deliver Categories from the server!");
        });

      }));


  }

  // uploadVideo(formData : FormData) : Observable<any>  //The original uploadVideo , we must change it to work with the new rendition system
  // {
  //   const token = this.authService.getLocalStorageToken();
  //   console.log(`Current token : ${token}`);

  //   const headers = new HttpHeaders(
  //   {
  //     Authorization : `Bearer ${token}`
  //   });
  //   console.log(`Header loggin ${headers.get('Authorization')}`);


  //     return this.httpClient.post<any>(`${ApiUrls.UPLOAD}`, formData, {headers});
  // }

  uploadVideoNew(formData : FormData) : Observable<UploadServerMessageResponse>
  {
    const token = this.authService.getLocalStorageToken();
    console.log(`Current token : ${token}`);

    const headers = new HttpHeaders(
    {
      Authorization : `Bearer ${token}`
    });
    console.log(`Header loggin ${headers.get('Authorization')}`);


    return this.httpClient.post<UploadServerMessageResponse>(`${ApiUrls.UPLOAD}`, formData, {headers});
  }

  getStatusForVideo(videoId : number) : Observable<any>
  {
    const params = {videoId : videoId}
    return this.httpClient.get<any>(`${ApiUrls.VIDEO}/polling/videoStatus`, {params})
  }



  getVideosSection() : Observable<CategoryWithVideos[]>
  {
      return this.httpClient.get<CategoryWithVideos[]>(`${ApiUrls.VIDEOSSECTIONS}`)
      .pipe(catchError((error) =>
      {
          console.error('Failed back end response',
          {
              message: error.message,
              status : error.status,
              error : error.error
          });
          return throwError(()=> new Error('Could not provide video catalog'))

      }))

  }
  getCurrentVideo(videoId : number) : Observable<PlayVideo>
  {
    return this.httpClient.get<PlayVideo>(`${ApiUrls.SELECTEDVIDEO}/${videoId}`)
    .pipe(catchError((error) =>
    {
        console.error('Failed to get a video from the server',
        {
              message : error.message,
              status : error.status,
              error : error.error,
        });

        return throwError(()=> new Error('Could not get the selected video'));

    }))

  }


  locallyUpdateCommentCountAfterUserReply()
  {
    this.commentsCountSubject.next(this.commentsCountSubject.getValue() + 1);
  }






 updateViews(selectedVideoId : number)
 {
    return this.httpClient.patch(`${ApiUrls.SELECTEDVIDEO}/${selectedVideoId}/updateViews`, null);
 }























  getUsersLikedVideosHistory(take? : number) : Observable<VideoWindow[]>
  {
    const token = this.authService.getLocalStorageToken();
    const headers = new HttpHeaders
    (
      {
        Authorization : `Bearer ${token}`
      }
    )

    const params = new HttpParams();
    if(take)
      params.set('take', take);

    return this.httpClient.get<VideoWindow[]>(`${ApiUrls.LIKEDVIDEOS}`, {headers, params});
  }

  deleteLikedVideoFromHistory(videoId : number) : Observable<{message : string}>
  {
    const token = this.authService.getLocalStorageToken();
    const headers = new HttpHeaders
    (
      {
        Authorization : `Bearer ${token}`
      }
    )
      return this.httpClient.delete<{message : string}>(`${ApiUrls.LIKEDVIDEOS}/${videoId}`,{headers})
  }

  addUpdateUserWatchHistory(videoId : number) : Observable<WatchHistoryVideoInfo>
  {
    const token = this.authService.getLocalStorageToken();
    const headers = new HttpHeaders
    (
      {
        Authorization : `Bearer ${token}`
      }
    )



    return this.httpClient.post<WatchHistoryVideoInfo>(`${ApiUrls.ADDVODTOHISTORY}/${videoId}`,null,{headers});
  }

  getUserVideosCatalog(userId : string | null) : Observable<VideoWindow[]>
  {
      return this.httpClient.get<VideoWindow[]>(`${ApiUrls.VIDEO}/user-profile/${userId}`);
  }

  getVideoWindow() : Observable<VideoWindow>
  {
    return this.httpClient.get<VideoWindow>(`${ApiUrls.VIDEO}/get-video-window`);
  }

  getVideoSearched(searchTerm : string) : Observable<VideoWindow[]>
  {
      return this.httpClient.get<VideoWindow[]>(`${ApiUrls.VIDEO}/search`, {params : {query : searchTerm}} );
  }

  saveCategoriesInMemory(categories : CategoryWithVideos[] | Category[])
  {
      const extractCategoriesFromObject : Category[] = categories.map(x => (
        {
          id : x.id,
          name : x.name
        }
      ))

      console.log(`Saving in memory these categories (check if something is missing)${extractCategoriesFromObject}`)

      this.categoriesSubject.next(extractCategoriesFromObject);
      sessionStorage.setItem('videoCategories', JSON.stringify(extractCategoriesFromObject))

  }

  saveVideoSelectedInMemory(video : VideoWindow)
  {
      this.selectedVideoSubcjet.next(video);
      sessionStorage.setItem('selectedVideo', JSON.stringify(video));
  }

  clearSelectedVIdeo()
  {
    this.selectedVideoSubcjet.next(null);
  }

  getEditVideoInfo(videoId : number) : Observable<VideoWindow>
  {
      const headers = this.getHttpHeaders();
      return this.httpClient.get<VideoWindow>(`${ApiUrls.VIDEO}/edit/${videoId}`, {headers});
  }

  private getHttpHeaders() : HttpHeaders
  {
    const token = this.authService.getLocalStorageToken();
    const headers = new HttpHeaders
    (
      {
        Authorization : `Bearer ${token}`
      }
    )

    return headers;
  }

  patchEditVideo(videoId : number ,formGroup : FormGroup<EditVideoFormControls> , newImageFile : string | undefined) : Observable<VideoWindow>
  {
    const headers = this.getHttpHeaders();

    const payload =
    {
      title : formGroup.value.Title ?? null,
      description : formGroup.value.Description ?? null,
      categoryId : formGroup.value.CategoryId ?? null,
      newImageString : newImageFile ?? null
    }
      console.log("Sending PATCH payload:", JSON.stringify(payload, null, 2));

    return this.httpClient.patch<VideoWindow>(`${ApiUrls.VIDEO}/edit/${videoId}`, payload ,{headers})
  }

  deleteVideo(videoId : number)
  {
    const headers = this.getHttpHeaders();

    return this.httpClient.delete(`${ApiUrls.VIDEO}/delete/${videoId}`,{headers})
  }

  getUserHistoryForYouPage() : Observable<VideoWindow[]>
  {
      const headers = this.getHttpHeaders();

      return this.httpClient.get<VideoWindow[]>(`${ApiUrls.VIDEO}/history/you`, {headers})
  }

  subscribeUserToVideoOwner(userId : string, followerUserNameProp : string , videoOwnerId : string , subscribedToUserNameProp : string)
  {
    const headers = this.getHttpHeaders();

    const subscribingDTO : SubscribingDTO =
    {
        followerId : userId,
        followerUserName : followerUserNameProp,
        subscribedToId : videoOwnerId,
        subscribedToUserName : subscribedToUserNameProp

    }

    return this.httpClient.post(`${ApiUrls.VIDEO}/subscribe`, subscribingDTO , {headers})
  }

  unSubscribeUserToVideoOwner(userId : string, followerUserNameProp : string , videoOwnerId : string , subscribedToUserNameProp : string)
  {
      const headers = this.getHttpHeaders();

       const subscribingDTO : SubscribingDTO =
    {
        followerId : userId,
        followerUserName : followerUserNameProp,
        subscribedToId : videoOwnerId,
        subscribedToUserName : subscribedToUserNameProp

    }

    const params : HttpParams = new HttpParams()
    .set('followerId', userId)
    .set('followerUserName', followerUserNameProp)
    .set('subscribedToId', videoOwnerId)
    .set('subscribedToUserName', subscribedToUserNameProp);


    console.log(params);
    return this.httpClient.delete(`${ApiUrls.VIDEO}/subscribe`, {headers,params});
  }

  getUserVideosFromSubscribers() : Observable<VideoWindow[]>
  {
    const headers = this.getHttpHeaders();

    return this.httpClient.get<VideoWindow[]>(`${ApiUrls.VIDEO}/subscriptions`, {headers});
  }

  getLikedVideosCount() : Observable<number>
  {
    const headers = this.getHttpHeaders();

    return this.httpClient.get<number>(`${ApiUrls.VIDEO}/collection`, {headers});
  }

  getVideoLikesDislikeCount(videoId : number) : Observable<VideoLikeDislikeCountDTO>
  {
    return this.httpClient.get<VideoLikeDislikeCountDTO>(`${ApiUrls.VIDEO}/${videoId}/likeDislikeCount`);
  }

  getCategoryStatsInViedoDescription(video : number) : Observable<CategoryStatsDTO>
  {
    return this.httpClient.get<CategoryStatsDTO>(`${ApiUrls.VIDEO}/${video}/descriptionCategory`);
  }

  getCategoryVideos(categoryId : number) : Observable<VideoWindow[]>
  {
    return this.httpClient.get<VideoWindow[]>(`${ApiUrls.VIDEO}/${categoryId}`);
  }

  getVideoSpriteSheet(spriteIndex : number, videoSpriteSheetBasePath : string) : Observable<string>
  {
    const params =
    {
      spriteIndex : spriteIndex,
      videoSpriteSheetBasePath : videoSpriteSheetBasePath
    }
    return this.httpClient.get<string>(`${ApiUrls.VIDEO}`, {params});
  }







}



