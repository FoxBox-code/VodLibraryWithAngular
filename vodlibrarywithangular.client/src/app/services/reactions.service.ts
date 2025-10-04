import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Reaction } from '../models/reaction';
import { firstValueFrom, Observable } from 'rxjs';
import { ApiUrls } from '../api-URLS';
import { userCommentReactions } from '../models/userCommentReactions';
import { CommentReactionResponse } from '../models/comment-reaction-response';
import { UserReplyReactions } from '../models/user-replies-reactions';
import { ReplyLikeDislikeCountUpdateDTO } from '../models/replyLikeDislikeCountUpdateDTO';
import { VideoLikeDislikeCountDTO } from '../models/video-like-dislike-countDTO';

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


  GetCurrentUserVideoReaction(videoId: number) : Observable<Reaction>
  {
    const headers = this.authService.getHttpHeaders();

    return this.httpClient.get<Reaction>(`${ApiUrls.REACTION_CONTROLLER}/${videoId}/reactions`, {headers})


  }


  deleteVideoReaction(videoId: number) : Observable<Reaction>
  {

    const headers = this.authService.getHttpHeaders();



    return this.httpClient.delete<Reaction>(`${ApiUrls.REACTION_CONTROLLER}/${videoId}/reactions`, {headers})
  }

  addOrUpdateVideoReaction(videoId : number, reaction : string) : Observable<Reaction>
  {

    const headers = this.authService.getHttpHeaders();

    return this.httpClient.post<Reaction>(`${ApiUrls.REACTION_CONTROLLER}/${videoId}/reactions`, { reactionType : reaction }, {headers})
  }

  getUserCommentLikesDislikes(videoId : number): Observable<userCommentReactions[]>
  {

    const headers = this.authService.getHttpHeaders();

    return this.httpClient.get<userCommentReactions[]>(`${ApiUrls.REACTION_CONTROLLER}/${videoId}/comment-reactions`, {headers})

  }

  addUpdateUserCommentReaction(commentId : number, reaction : boolean) : Observable<CommentReactionResponse>
  {

    const headers = this.authService.getHttpHeaders();

    return this.httpClient.post<CommentReactionResponse>(`${ApiUrls.REACTION_CONTROLLER}/${commentId}/comment-reactions`, {like : reaction},{headers})
  }


  deleteUserCommentReaction(commentId : number ) : Observable<CommentReactionResponse>
  {

    const headers = this.authService.getHttpHeaders();


    return this.httpClient.delete<CommentReactionResponse>(`${ApiUrls.REACTION_CONTROLLER}/${commentId}/comment-reactions`,{headers})
  }

  getUserRepliesReactions(commentId : number) : Observable<UserReplyReactions[]>
  {

    const headers = this.authService.getHttpHeaders();

    return this.httpClient.get<UserReplyReactions[]>(`${ApiUrls.REACTION_CONTROLLER}/${commentId}/replies-user-reactions`, {headers})
  }

  addUpdateReplyReaction(replyId : number, reaction : boolean) : Observable<ReplyLikeDislikeCountUpdateDTO>
  {

    const headers = this.authService.getHttpHeaders();

    return this.httpClient.post<ReplyLikeDislikeCountUpdateDTO>(`${ApiUrls.REACTION_CONTROLLER}/${replyId}/replies-user-reactions`, {reactionType : reaction}, {headers})
  }

  deleteUserReplyReaction(replyId : number) : Observable<ReplyLikeDislikeCountUpdateDTO>
  {

    const headers = this.authService.getHttpHeaders();

    return this.httpClient.delete<ReplyLikeDislikeCountUpdateDTO>(`${ApiUrls.REACTION_CONTROLLER}/${replyId}/replies-user-reactions`, {headers})

  }

  clearUserReactions()
  {
      this.userCommentReactions = {};
      this.userReplyReactions = {}
  }

   updateUserVideoReaction(selectedVideoId : number , userVideoReaction : Reaction, reactionClicked : string) : Observable<Reaction>
      {


          let updatedValue;
          if(userVideoReaction.reaction === reactionClicked)
            {

              updatedValue = this.deleteVideoReaction(selectedVideoId)

            }
            else
            {
              updatedValue = this.addOrUpdateVideoReaction(selectedVideoId, reactionClicked)


            }

            return updatedValue;
      }

      clientSideLikeDisklikeIncrementation(userVideoReaction : Reaction, reactionClicked : string, likeDislikeCounter : VideoLikeDislikeCountDTO,)//simply changes the count of the like/dislike +/-1 also known as eager loading
      {
        if(reactionClicked === userVideoReaction.reaction)
        {
          if(userVideoReaction.reaction === "Like")
          {
            likeDislikeCounter.likes--;
          }
          else if(userVideoReaction.reaction === "Dislike")
          {
            likeDislikeCounter.dislikes--;
          }

        }
        else if(userVideoReaction.reaction !== "None" && userVideoReaction.reaction !== reactionClicked)
        {
          switch(reactionClicked)
          {
            case "Like":
              likeDislikeCounter.likes++;
              likeDislikeCounter.dislikes--;
              break;
            case "Dislike":
              likeDislikeCounter.dislikes++;
              likeDislikeCounter.likes--;
              break;
              default :
              console.error("I can t bloody re write this fucking project");

          }
        }
        else if(userVideoReaction.reaction === 'None')
        {
          switch(reactionClicked)
          {
            case "Like":
              likeDislikeCounter.likes++;

              break;
            case "Dislike":
              likeDislikeCounter.dislikes++;

              break;
              default :
              console.error("I can t bloody re write this fucking project");

          }
        }
      }



}
