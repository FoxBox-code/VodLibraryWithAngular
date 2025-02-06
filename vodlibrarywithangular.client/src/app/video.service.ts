import { Injectable,inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Category } from './models/category';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ApiUrls } from './api-URLS';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { CategoryWithVideos } from './models/category-with-videos';
import { PlayVideo } from './models/play-video';
import { AddCommentDTO } from './models/add-comment';
import { VideoComment } from './models/comment';
import { ReplyForm } from './models/reply-form';
import { Reply } from './models/reply';

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

  private videoCommentsSubject = new BehaviorSubject<VideoComment[]>([]);
  videoComment$ = this.videoCommentsSubject.asObservable();

  private viewsSubject = new BehaviorSubject<number>(0);
  views$ = this.viewsSubject.asObservable();

  private commentRepliesSubject = new BehaviorSubject<Reply[]>([]);
  commentReplies$ = this.commentRepliesSubject.asObservable();

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

  uploadVideo(formData : FormData) : Observable<any>
  {
    const token = this.authService.getLocalStorageToken();
    console.log(`Current token : ${token}`);

    const headers = new HttpHeaders(
    {
      Authorization : `Bearer ${token}`
    });
    console.log(`Header loggin ${headers.get('Authorization')}`);


      return this.httpClient.post<any>(`${ApiUrls.UPLOAD}`, formData, {headers});
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
  getVideoComments(videoId : number) : void
  {
      this.httpClient.get<VideoComment[]>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/comments`)
      .pipe(catchError((error)=>
      {
        console.error("Failed to get a comments from the server",
        {
            message : error.message,
            status : error.status,
            error : error.error
        });

        return throwError(()=> new Error("Could not get the comments from the selected video"))

      })).subscribe(
      {
          next : (result) =>
          {
              this.videoCommentsSubject.next(result);
          },
          error : (error) =>
          {
              console.error("Could not retrive the commets from the server", error);

          }
      })
  }
  addComment(comment : AddCommentDTO) : Observable<AddCommentDTO>
  {
    const token = this.authService.getLocalStorageToken();
    console.log(`Current token : ${token}`);

    const headers = new HttpHeaders(
    {
      Authorization : `Bearer ${token}`
    });
    console.log(`Header loggin ${headers.get('Authorization')}`);

      return this.httpClient.post<AddCommentDTO>(`${ApiUrls.ADDCOMMENT}`, comment, {headers})
      .pipe(catchError((error)=>
        {
          console.error("Failed to add a comments to the database",
          {
              message : error.message,
              status : error.status,
              error : error.error
          });

          return throwError(() => new Error("The server failed to add the coment of the user to the video"))

        }))
  }

  getCommentsCount(videoId : number) : void
  {
      this.httpClient.get<number>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/commentsCount`)
      .subscribe(
      {
          next : (result) => this.commentsCountSubject.next(result),
          error : (error) => console.error(`Failed to fetch the comments count from the server ${error}`)

      })
  }

  refreshCommentsCount(videoId : number)
  {
    this.getCommentsCount(videoId);
  }

  getVideoViews(videoId : number)
  {
    this.httpClient.get<number>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/updateViews`)
    .subscribe(
    {
        next : (result) =>
        {
            this.viewsSubject.next(result);
        },
        error : (error) =>
        {
            console.error('Failed to get the video views from the server', error);

        }
    })
  }

  addReplyToComment(reply : ReplyForm) : Observable<ReplyForm>
  {
      const token = this.authService.getLocalStorageToken();

      const headers = new HttpHeaders(
      {
        Authorization : `Bearer ${token}`
      })

      return this.httpClient.post<ReplyForm>(`${ApiUrls.ADDREPLY}`, reply , {headers})
      .pipe(catchError((error)=>
      {
        console.error("Failed to add a reply to the database",
          {
              message : error.message,
              status : error.status,
              error : error.error
          });

          return throwError (() => new Error("The server failed to add the reply of the user to the comment"))
      }))
  }

  getCommentReplies(videoId : number , commentId: number)
  {
      this.httpClient.get<Reply[]>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/${commentId}/replies`)
      .pipe(catchError((error)=>
      {
          console.error(
          {
              message : error.message,
              status : error.status,
              erorr : error.error
          });

          return throwError(()=> new Error(`Failed to get the replies from the server for video with id ${videoId} in comment with id ${commentId}`))

      }))
      .subscribe(
      {
        next : (result) =>
        {
            this.commentRepliesSubject.next(result);
        }
      });
  }

}



