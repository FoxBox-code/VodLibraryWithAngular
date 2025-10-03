import { Injectable } from '@angular/core';
import { AddCommentDTO } from '../models/add-CommentDTO';
import { BehaviorSubject, catchError, Observable, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ApiUrls } from '../api-URLS';
import { Reply } from '../models/reply';
import { ReplyForm } from '../models/reply-form';
import { VideoComment } from '../models/videoComment';
import { commentCriteria } from '../types/comments-type';

@Injectable({
  providedIn: 'root'
})
export class CommentService
{

  public commentRepliesSubject : {[commentId:number] : BehaviorSubject<Reply[]>} = {};
  public didWeTookRepliesCorrecty = false;

  private videoCommentsSubject = new BehaviorSubject<VideoComment[]>([]);
  public videoComments$ = this.videoCommentsSubject.asObservable();

  takeCommentCount = 10;
  skipCommentCount = 0;

  public commentSortType  : commentCriteria = "newest";

  constructor(private authService : AuthService, private httpClient: HttpClient,) { }



  addComment(comment : AddCommentDTO) : void
    {
      const token = this.authService.getLocalStorageToken();
      console.log(`Current token : ${token}`);

      const headers = this.authService.getHttpHeaders();

      console.log(`Header loggin ${headers.get('Authorization')}`);

         this.httpClient.post<VideoComment>(`${ApiUrls.ADDCOMMENT}`, comment, {headers})
        .pipe(catchError((error)=>
          {
            console.error("Failed to add a comments to the database",
            {
                message : error.message,
                status : error.status,
                error : error.error
            });

            return throwError(() => new Error("The server failed to add the coment of the user to the video"))

          })
        ).subscribe(
          {
            next : (newComment) =>
            {
              newComment.uploaded = new Date(newComment.uploaded);
              const currComments = this.videoCommentsSubject.value;
              const newCollectionVideoComments = [newComment , ...currComments];
              this.videoCommentsSubject.next(newCollectionVideoComments)
            }
          }
        )
    }
    getVideoComments(videoId : number, )//loadcomments
      {
          const params : {[key : string]: number | string  }=
            {
              'Take' : this.takeCommentCount,
              'Skip' : this.skipCommentCount,
              'sortType' : this.commentSortType
            };

          return this.httpClient.get<VideoComment[]>(`${ApiUrls.COMMENT_CONTROLLLER}/${videoId}`, {params})
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
          .subscribe
          (
            {
              next : (newComments) =>
              {
                  const currentComments = this.videoCommentsSubject.getValue();
                    newComments = newComments.map(x => (
                      {
                        ...x,
                        uploaded : new Date(x.uploaded)
                      }
                    ))

                    const upDatedComments : VideoComment[] = [...currentComments , ...newComments];
                    this.videoCommentsSubject.next(upDatedComments);
                    this.skipCommentCount +=this.takeCommentCount;

                    console.log(this.videoCommentsSubject.value);
              },
              error : (err) =>
              {
                  console.error(`Failed to get the comments for ${videoId} `, err);
              }
            }
          )
      }

    addComment5000(comment : AddCommentDTO) : Observable<AddCommentDTO>
    {
      const headers = this.authService.getHttpHeaders();

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

      addReplyToComment5000(reply : ReplyForm) : Observable<Reply>
        {
            const token = this.authService.getLocalStorageToken();

            const headers = new HttpHeaders(
            {
              Authorization : `Bearer ${token}`
            })

            return this.httpClient.post<Reply>(`${ApiUrls.ADDREPLY5000}`, reply , {headers});

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

          getCommentReplies(videoId : number , commentId: number, skip : number) : Promise<Reply[]>
          {
              if(!this.commentRepliesSubject.hasOwnProperty(commentId))
                this.commentRepliesSubject[commentId] = new BehaviorSubject<Reply[]>([]);

              const params = {'skip' : skip};

              return new Promise((resolve , reject) =>
              {
                    this.httpClient.get<Reply[]>(`${ApiUrls.COMMENT_CONTROLLLER}/${videoId}/${commentId}/replies`, {params})
                .pipe(
                  catchError(error =>
                  {
                      console.log(error);
                      this.didWeTookRepliesCorrecty = false;
                      reject(error);
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
                  const previous = this.commentRepliesSubject[commentId]?.getValue() ?? [];
                  this.commentRepliesSubject[commentId].next([...previous, ...replies]);//This build is O(n) kind a shit
                  this.didWeTookRepliesCorrecty = true;
                  resolve(replies);
                }
              )
              })





          }

          sortCommentsForBehaviorSubject(videoComment : VideoComment[])//TODO
          {

          }

          sortComments(videoId : number, criteria : 'popular' | 'newest',)
          {

            this.commentSortType = criteria;
            const params =
            {
              'sortType' : criteria,
              'commentsToFetchAndSort': this.countOfCurrentlyPulledComments()
            }
              return this.httpClient.get<VideoComment[]>(`${ApiUrls.COMMENT_CONTROLLLER}/${videoId}/sort`, {params})
              .subscribe(
                {
                  next : (comments) =>
                  {
                    comments = comments.map(comment =>
                    {
                      comment.uploaded = new Date(comment.uploaded);

                      return comment;
                    }
                    )
                    this.videoCommentsSubject.next(comments);
                  },
                  error : (err) =>
                  {
                      console.error("Back end failed to sort the comments", err);
                  }
                }
              )


          }

          countOfCurrentlyPulledComments() : number
          {
            return this.videoCommentsSubject.value.length;
          }

          updateVideoCommentsSubjectBehavior(upDatedComments : VideoComment[])
          {
            this.videoCommentsSubject.next(upDatedComments);
          }

          clearCommentsState()
          {
            this.videoCommentsSubject.next([]);
            this.skipCommentCount = 0;
          }


}
