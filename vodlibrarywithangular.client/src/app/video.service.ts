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
import { Reaction } from './models/reaction';
import { userCommentReactions } from './models/userCommentReactions';
import { CommentReactionResponse } from './models/comment-reaction-response';
import { UserReplyReactions } from './models/user-replies-reactions';
import { ReplyLikeDislikeCountUpdateDTO } from './models/replyLikeDislikeCountUpdateDTO';
import { VideoWindow } from './models/video-window';
import { WatchHistoryVideoInfo } from './models/watch-history-video-info';

@Injectable({
  providedIn: 'root'
})
export class VideoService
{
  constructor(private httpClient : HttpClient, private authService : AuthService)
  {
      authService.logout$.subscribe(() =>
      {
        this.clearUserReactions();
      })
  }

  private commentsCountSubject = new BehaviorSubject<number>(0);
  commentsCount$ = this.commentsCountSubject.asObservable();

  private videoCommentsSubject = new BehaviorSubject<VideoComment[]>([]);
  videoComment$ = this.videoCommentsSubject.asObservable();

  private viewsSubject = new BehaviorSubject<number>(0);
  views$ = this.viewsSubject.asObservable();

  private commentRepliesSubject2 : {[commentId:number] : BehaviorSubject<Reply[]>} = {};

  public userCommentReactions: { [commentId: number]: boolean | undefined } = {};
  public userReplyReactions : {[replyId : number] : boolean | undefined} = {};


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

  getCommentReplies(videoId : number , commentId: number) : Observable<Reply[]>
  {
    if(!this.commentRepliesSubject2[commentId])
    {
      this.commentRepliesSubject2[commentId] = new BehaviorSubject<Reply[]>([]);

      this.httpClient.get<Reply[]>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/${commentId}/replies`)
      .pipe(
        catchError(error =>
        {
            console.log(error);
            return throwError(() => new Error(`Failed to load replires`))
        })
          )
      .subscribe(replies =>
      {
        this.commentRepliesSubject2[commentId].next(replies);
      }
      )
    }

        return this.commentRepliesSubject2[commentId].asObservable();

  }

  getVideoReactions(videoId: number) : Observable<Reaction>
  {
    return this.httpClient.get<Reaction>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/reactions`)
  }

  deleteVideoReaction(videoId: number) : Observable<Reaction>
  {
    const token = this.authService.getLocalStorageToken();
    const headers = new HttpHeaders(
      {
        Authorization : `Bearer ${token}`
      }
    )

    return this.httpClient.delete<Reaction>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/reactions`, {headers})
  }

  addOrUpdateVideoReaction(videoId : number, reaction : string) : Observable<Reaction>
  {
    const token = this.authService.getLocalStorageToken();
    const headers = new HttpHeaders(
      {
        Authorization : `Bearer ${token}`
      }
    )
    return this.httpClient.post<Reaction>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/reactions`, { reactionType : reaction }, {headers})
  }

  getUserCommentLikesDislikes(videoId : number): Observable<userCommentReactions[]>
  {
    const token = this.authService.getLocalStorageToken();
    const headers = new HttpHeaders
    (
      {
        Authorization : `Bearer ${token}`
      }
    )

    return this.httpClient.get<userCommentReactions[]>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/comment-reactions`, {headers})

  }

  addUpdateUserCommentReaction(commentId : number, reaction : boolean) : Observable<CommentReactionResponse>
  {
    const token = this.authService.getLocalStorageToken();
    const headers = new HttpHeaders
    (
      {
        Authorization : `Bearer ${token}`
      }
    )

    return this.httpClient.post<CommentReactionResponse>(`${ApiUrls.SELECTEDVIDEO}/${commentId}/comment-reactions`, {like : reaction},{headers})
  }

  deleteUserCommentReaction(commentId : number ) : Observable<CommentReactionResponse>
  {
    const token = this.authService.getLocalStorageToken();
    const headers = new HttpHeaders
    (
      {
        Authorization : `Bearer ${token}`
      }
    )

    return this.httpClient.delete<CommentReactionResponse>(`${ApiUrls.SELECTEDVIDEO}/${commentId}/comment-reactions`,{headers})
  }

  getUserRepliesReactions(commentId : number) : Observable<UserReplyReactions[]>
  {
    const token = this.authService.getLocalStorageToken();
    const headers = new HttpHeaders
    (
      {
        Authorization : `Bearer ${token}`
      }
    )
    return this.httpClient.get<UserReplyReactions[]>(`${ApiUrls.SELECTEDVIDEO}/${commentId}/replies-user-reactions`, {headers})
  }

  clearUserReactions()
  {
      this.userCommentReactions = {};
      this.userReplyReactions = {}
  }

  addUpdateReplyReaction(replyId : number, reaction : boolean) : Observable<ReplyLikeDislikeCountUpdateDTO>
  {
    const token = this.authService.getLocalStorageToken();
    const headers = new HttpHeaders
    (
      {
        Authorization : `Bearer ${token}`
      }
    )

    return this.httpClient.post<ReplyLikeDislikeCountUpdateDTO>(`${ApiUrls.SELECTEDVIDEO}/${replyId}/replies-user-reactions`, {reactionType : reaction}, {headers})
  }

  deleteUserReplyReaction(replyId : number) : Observable<ReplyLikeDislikeCountUpdateDTO>
  {
    const token = this.authService.getLocalStorageToken();
    const headers = new HttpHeaders
    (
      {
        Authorization : `Bearer ${token}`
      }
    )

    return this.httpClient.delete<ReplyLikeDislikeCountUpdateDTO>(`${ApiUrls.SELECTEDVIDEO}/${replyId}/replies-user-reactions`, {headers})

  }

  getUsersLikedVideosHistory() : Observable<VideoWindow[]>
  {
    const token = this.authService.getLocalStorageToken();
    const headers = new HttpHeaders
    (
      {
        Authorization : `Bearer ${token}`
      }
    )

    return this.httpClient.get<VideoWindow[]>(`${ApiUrls.LIKEDVIDEOS}`, {headers});
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




}



