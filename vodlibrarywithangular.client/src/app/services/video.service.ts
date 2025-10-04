import { Injectable,inject } from '@angular/core';
import { BehaviorSubject, Observable, retry } from 'rxjs';
import { Category } from '../models/category';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams, HttpParamsOptions, HttpRequest } from '@angular/common/http';
import { ApiUrls } from '../api-URLS';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { CategoryWithVideos } from '../models/category-with-videos';
import { PlayVideo } from '../models/play-video';
import { VideoComment } from '../models/videoComment';

import { Reaction } from '../models/reaction';

import { VideoWindow } from '../models/video-window';
import { WatchHistoryVideoInfo } from '../models/watch-history-video-info';
import { FormGroup } from '@angular/forms';
import { EditVideoFormControls } from '../models/EditVideoFormControls';
import { SubscribingDTO } from '../models/subscribingDTO';
import { VideoLikeDislikeCountDTO } from '../models/video-like-dislike-countDTO';
import { CategoryStatsDTO } from '../models/categorystatsDTO';
import { UploadServerMessageResponse } from '../models/uploadServerMessageResponse';


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
    return this.httpClient.get<PlayVideo>(`${ApiUrls.PLAY}/${videoId}`)
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
    return this.httpClient.patch(`${ApiUrls.VIDEO_CONTROLLER}/${selectedVideoId}/updateViews`, null);
 }

























  getUserVideosCatalog(userId : string | null) : Observable<VideoWindow[]>
  {
      return this.httpClient.get<VideoWindow[]>(`${ApiUrls.VIDEO_CONTROLLER}/user-profile/${userId}`);
  }

  getVideoWindow() : Observable<VideoWindow>
  {
    return this.httpClient.get<VideoWindow>(`${ApiUrls.VIDEO_CONTROLLER}/get-video-window`);
  }

  getVideoSearched(searchTerm : string) : Observable<VideoWindow[]>
  {
      return this.httpClient.get<VideoWindow[]>(`${ApiUrls.VIDEO_CONTROLLER}/search`, {params : {query : searchTerm}} );
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













  getLikedVideosCount() : Observable<number>
  {
    const headers = this.authService.getHttpHeaders();

    return this.httpClient.get<number>(`${ApiUrls.VIDEO_CONTROLLER}/collection`, {headers});
  }

  getVideoLikesDislikeCount(videoId : number) : Observable<VideoLikeDislikeCountDTO>
  {
    return this.httpClient.get<VideoLikeDislikeCountDTO>(`${ApiUrls.VIDEO_CONTROLLER}/${videoId}/likeDislikeCount`);
  }

  getCategoryStatsInViedoDescription(video : number) : Observable<CategoryStatsDTO>
  {
    return this.httpClient.get<CategoryStatsDTO>(`${ApiUrls.VIDEO_CONTROLLER}/${video}/descriptionCategory`);
  }

  getCategoryVideos(categoryId : number) : Observable<VideoWindow[]>
  {
    return this.httpClient.get<VideoWindow[]>(`${ApiUrls.VIDEO_CONTROLLER}/${categoryId}`);
  }

  getVideoSpriteSheet(spriteIndex : number, videoSpriteSheetBasePath : string) : Observable<string>
  {
    const params =
    {
      spriteIndex : spriteIndex,
      videoSpriteSheetBasePath : videoSpriteSheetBasePath
    }
    return this.httpClient.get<string>(`${ApiUrls.VIDEO_CONTROLLER}`, {params});
  }



}



