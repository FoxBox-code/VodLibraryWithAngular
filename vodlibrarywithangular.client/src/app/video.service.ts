import { Injectable,inject } from '@angular/core';
import { BehaviorSubject, Observable, retry } from 'rxjs';
import { Category } from './models/category';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams, HttpParamsOptions, HttpRequest } from '@angular/common/http';
import { ApiUrls } from './api-URLS';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { CategoryWithVideos } from './models/category-with-videos';
import { PlayVideo } from './models/play-video';
import { AddCommentDTO } from './models/add-CommentDTO';
import { VideoComment } from './models/videoComment';
import { ReplyForm } from './models/reply-form';
import { Reply } from './models/reply';
import { Reaction } from './models/reaction';
import { userCommentReactions } from './models/userCommentReactions';
import { CommentReactionResponse } from './models/comment-reaction-response';
import { UserReplyReactions } from './models/user-replies-reactions';
import { ReplyLikeDislikeCountUpdateDTO } from './models/replyLikeDislikeCountUpdateDTO';
import { VideoWindow } from './models/video-window';
import { WatchHistoryVideoInfo } from './models/watch-history-video-info';
import { FormGroup } from '@angular/forms';
import { EditVideoFormControls } from './models/EditVideoFormControls';
import { SubscribingDTO } from './models/subscribingDTO';
import { VideoLikeDislikeCountDTO } from './models/video-like-dislike-countDTO';
import { CategoryStatsDTO } from './models/categorystatsDTO';

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

  public videoCommentsSubject = new BehaviorSubject<VideoComment[]>([]);
  videoComment$ = this.videoCommentsSubject.asObservable();

  private viewsSubject = new BehaviorSubject<number>(0);
  views$ = this.viewsSubject.asObservable();

  private commentRepliesSubject : {[commentId:number] : BehaviorSubject<Reply[]>} = {};

  public userCommentReactions: { [commentId: number]: boolean | undefined } = {};

  public userReplyReactions : {[replyId : number] : boolean | undefined} = {};

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
  getVideoComments(videoId : number, takeCommentCount : number, skipCommentCount : number)
  {
      const params : {[key : string]: number  }=
        {
          'Take' : takeCommentCount,
          'Skip' : skipCommentCount
        };

      return this.httpClient.get<VideoComment[]>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/comments`, {params})
      .pipe(catchError((error)=>
      {
        console.error("Failed to get a comments from the server",
        {
            message : error.message,
            status : error.status,
            error : error.error
        });

        return throwError(()=> new Error("Could not get the comments from the selected video"))

      }))
  }

  locallyUpdateCommentCountAfterUserReply()
  {
    this.commentsCountSubject.next(this.commentsCountSubject.getValue() + 1);
  }

  sortCommentsForBehaviorSubject(videoComments : VideoComment[])
  {

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
  addComment5000(comment : AddCommentDTO) : Observable<AddCommentDTO>
  {
    const headers = this.getHttpHeaders();

      return this.httpClient.post<AddCommentDTO>(`${ApiUrls.ADDCOMMENT5000}`, comment, {headers})
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

  // getCommentsCount(videoId : number) : void
  // {
  //     this.httpClient.get<number>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/commentsCount`)
  //     .subscribe(
  //     {
  //         next : (result) => this.commentsCountSubject.next(result),
  //         error : (error) => console.error(`Failed to fetch the comments count from the server ${error}`)

  //     })
  // }

  // refreshCommentsCount(videoId : number)
  // {
  //   this.getCommentsCount(videoId);
  // }

 updateViews(selectedVideoId : number)
 {
    return this.httpClient.patch(`${ApiUrls.SELECTEDVIDEO}/${selectedVideoId}/updateViews`, null);
 }

  addReplyToComment(reply : ReplyForm) : Observable<Reply>
  {
      const token = this.authService.getLocalStorageToken();

      const headers = new HttpHeaders(
      {
        Authorization : `Bearer ${token}`
      })

      return this.httpClient.post<Reply>(`${ApiUrls.ADDREPLY}`, reply , {headers})
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

  updateCommentRepliesSubject(commentId : number, reply : Reply)
  {
    const subject = this.commentRepliesSubject[commentId];

    if(!subject)
    {
      return console.log(`Failed to load reply ${reply} on comment with id${commentId}`)
    }

    const currentReplies = subject.getValue();
    const clientSideUpdatedReplies = [...currentReplies, reply];

    subject.next(clientSideUpdatedReplies);
  }

  getCommentReplies(videoId : number , commentId: number) : Observable<Reply[]>
  {
    if(!this.commentRepliesSubject[commentId])
    {
      this.commentRepliesSubject[commentId] = new BehaviorSubject<Reply[]>([]);

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
        replies = replies.map(x => (
          {
            ...x,
            uploaded : new Date(x.uploaded)
          }//Change if it causes issues
        ))
        this.commentRepliesSubject[commentId].next(replies);
      }
      )
    }

        return this.commentRepliesSubject[commentId].asObservable();

  }

  getVideoReactions(videoId: number) : Observable<Reaction>
  {
    const headers = this.authService.getHttpHeaders();

    return this.httpClient.get<Reaction>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/reactions`, {headers})
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







}



