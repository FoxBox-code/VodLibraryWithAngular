import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Reaction } from './models/reaction';
import { Observable } from 'rxjs';
import { ApiUrls } from './api-URLS';
import { userCommentReactions } from './models/userCommentReactions';
import { CommentReactionResponse } from './models/comment-reaction-response';
import { UserReplyReactions } from './models/user-replies-reactions';
import { ReplyLikeDislikeCountUpdateDTO } from './models/replyLikeDislikeCountUpdateDTO';

@Injectable({
  providedIn: 'root'
})
export class ReactionsService
{
  public userCommentReactions: { [commentId: number]: boolean | undefined } = {};
  public userReplyReactions : {[replyId : number] : boolean | undefined} = {};
  constructor(private httpClient : HttpClient, private authService : AuthService)
  {
    authService.logout$.subscribe(() =>
      {
        this.clearUserReactions();
      })
  }


  getVideoReactions(videoId: number) : Observable<Reaction>
  {
    const headers = this.authService.getHttpHeaders();

    return this.httpClient.get<Reaction>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/reactions`, {headers})
  }

  deleteVideoReaction(videoId: number) : Observable<Reaction>
  {

    const headers = this.authService.getHttpHeaders();



    return this.httpClient.delete<Reaction>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/reactions`, {headers})
  }

  addOrUpdateVideoReaction(videoId : number, reaction : string) : Observable<Reaction>
  {

    const headers = this.authService.getHttpHeaders();

    return this.httpClient.post<Reaction>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/reactions`, { reactionType : reaction }, {headers})
  }

  getUserCommentLikesDislikes(videoId : number): Observable<userCommentReactions[]>
  {

    const headers = this.authService.getHttpHeaders();

    return this.httpClient.get<userCommentReactions[]>(`${ApiUrls.SELECTEDVIDEO}/${videoId}/comment-reactions`, {headers})

  }

  addUpdateUserCommentReaction(commentId : number, reaction : boolean) : Observable<CommentReactionResponse>
  {

    const headers = this.authService.getHttpHeaders();

    return this.httpClient.post<CommentReactionResponse>(`${ApiUrls.SELECTEDVIDEO}/${commentId}/comment-reactions`, {like : reaction},{headers})
  }


  deleteUserCommentReaction(commentId : number ) : Observable<CommentReactionResponse>
  {

    const headers = this.authService.getHttpHeaders();


    return this.httpClient.delete<CommentReactionResponse>(`${ApiUrls.SELECTEDVIDEO}/${commentId}/comment-reactions`,{headers})
  }

  getUserRepliesReactions(commentId : number) : Observable<UserReplyReactions[]>
  {

    const headers = this.authService.getHttpHeaders();

    return this.httpClient.get<UserReplyReactions[]>(`${ApiUrls.SELECTEDVIDEO}/${commentId}/replies-user-reactions`, {headers})
  }

  addUpdateReplyReaction(replyId : number, reaction : boolean) : Observable<ReplyLikeDislikeCountUpdateDTO>
  {

    const headers = this.authService.getHttpHeaders();

    return this.httpClient.post<ReplyLikeDislikeCountUpdateDTO>(`${ApiUrls.SELECTEDVIDEO}/${replyId}/replies-user-reactions`, {reactionType : reaction}, {headers})
  }

  deleteUserReplyReaction(replyId : number) : Observable<ReplyLikeDislikeCountUpdateDTO>
  {

    const headers = this.authService.getHttpHeaders();

    return this.httpClient.delete<ReplyLikeDislikeCountUpdateDTO>(`${ApiUrls.SELECTEDVIDEO}/${replyId}/replies-user-reactions`, {headers})

  }

  clearUserReactions()
  {
      this.userCommentReactions = {};
      this.userReplyReactions = {}
  }

}
