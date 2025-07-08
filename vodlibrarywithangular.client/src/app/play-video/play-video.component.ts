import { Component, Inject, inject} from '@angular/core';
import { VideoService } from '../video.service';
import { PlayVideo } from '../models/play-video';
import { ActivatedRoute } from '@angular/router';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';

import { NavigationService } from '../navigation.service';
import { Router } from '@angular/router';
import { AddCommentDTO } from '../models/add-comment';
import { VideoComment } from '../models/comment';
import { ReplyForm } from '../models/reply-form';
import { Reply } from '../models/reply';
import { Reaction } from '../models/reaction';
import { ReplyLikeDislikeCountUpdateDTO } from '../models/replyLikeDislikeCountUpdateDTO';


@Component({
  selector: 'app-play-video',
  standalone: false,

  templateUrl: './play-video.component.html',
  styleUrl: './play-video.component.css'
})
export class PlayVideoComponent
{
    selectedVideo : PlayVideo | null = null;
    selectedVideoId : number;
    commentForm : FormGroup;
    replyForm? : FormGroup;
    replyCommentId? : number;
    activeCommentId? : number;
    activeCommentReplyId? : number;
    commentsCountObservable : Observable<number>
    userNameAsObservable : Observable<string | null>;
    userName : string | null = null;
    nagivationService = inject(NavigationService);
    router = inject(Router);
    videoComments$? : Observable<VideoComment[]>;

    commentReplies$ : {[commentId : number] :Observable<Reply[]>} = {};
    expandRepliesComments : {[commentId : number] :  boolean} = {};
    autoLoadComments : boolean = false;
    views$? : Observable<number>;

    reaction? : Reaction;

    videoCommentsSnapshot: VideoComment[] = [];

    // private destroy$ = new Subject<void>();



    constructor(private videoService : VideoService, private activatedRoute:ActivatedRoute, private formBuilder : FormBuilder, private authService : AuthService)
    {
        this.selectedVideoId = Number(this.activatedRoute.snapshot.paramMap.get('id'));

        videoService.getCurrentVideo(this.selectedVideoId).subscribe(
        {
            next : (result) =>
            {
                this.selectedVideo = result;
                console.log(JSON.stringify(this.selectedVideo));
                videoService.getVideoViews(this.selectedVideoId);
            }



        })

        this.commentForm = formBuilder.group(
        {
            Comment : ['', [Validators.required]]
        });

        this.userNameAsObservable = authService.getUserNameAsOservable();
        this.userNameAsObservable.subscribe(value =>
          {
            this.userName = value;
            console.log(`Current name of user is : ${this.userName}`);


          })

        videoService.getCommentsCount(this.selectedVideoId);
        this.commentsCountObservable = videoService.commentsCount$;
        this.views$ = videoService.views$;


    }

    ngOnInit() : void
    {
        this.loadReactions();
        console.log("PlayVideoComponent loaded");

    }

    addComment()
    {
        if(this.commentForm.invalid)
        {
            console.error("Invalid commonet form ");

        }
        else
        {
          let addCommentDTO: AddCommentDTO =
          {
            userName: '',  // default empty string
            description: '',   // default empty string
            videoRecordId: 0,
            // initialize other properties as needed

          };


          if(this.userName !== null)
            {
              addCommentDTO.userName = this.userName ;
            }
              addCommentDTO.description = this.commentForm.value.Comment;
              addCommentDTO.videoRecordId = this.selectedVideoId;

              this.videoService.addComment(addCommentDTO).subscribe(
              {
                next : (result) =>
                {
                  console.log(`User ${result.userName} commented : ${result.description}`);

                  this.videoService.refreshCommentsCount(this.selectedVideoId);

                  if(this.autoLoadComments)
                    {
                      this.loadComments();
                    }
                },
                error : (error) => console.error(`User ${addCommentDTO.userName} failed to upload comment ${error}`)
              });

              this.commentForm.reset();
            }


    }
    addCommentReaction(commentId : number, reaction : boolean)
    {
      if(this.userName === null) return

      const userReactions = this.videoService.userCommentReactions;
      const exists = userReactions[commentId];

      if(exists == undefined)
      {
          this.createCommentReaction(commentId, reaction);
      }
      else if (exists === reaction)
      {
        this.deleteCommentReaction(commentId);
      }
      else
      {
        this.updateCommentReaction(commentId, reaction);
      }
    }

    private createCommentReaction(commentId : number , reaction : boolean)
    {
        this.videoService.addUpdateUserCommentReaction(commentId, reaction)
        .subscribe(result => {
        this.videoService.userCommentReactions[commentId] = result.like;
        this.updateCommentCounts(commentId, result.likeCount, result.dislikeCount);
    });
    }
    private deleteCommentReaction(commentId : number)
    {
        this.videoService.deleteUserCommentReaction(commentId)
        .subscribe(result => {
        delete this.videoService.userCommentReactions[commentId];
        this.updateCommentCounts(commentId, result.likeCount, result.dislikeCount);
    });
    }
    private updateCommentReaction(commentId: number, reaction: boolean)
    {
        this.videoService.addUpdateUserCommentReaction(commentId, reaction)
      .subscribe(result => {
      this.videoService.userCommentReactions[commentId] = result.like;
      this.updateCommentCounts(commentId, result.likeCount, result.dislikeCount);
      });
    }

    private updateCommentCounts(commentId: number, likeCount: number, dislikeCount: number)
    {
      const comment = this.findComment(commentId);
      if (comment)
      {
        comment.likes = likeCount;
        comment.disLikes = dislikeCount;
        }
      }




    findComment(commentId: number) : VideoComment | undefined
    {
      return this.videoCommentsSnapshot.find(x => x.id === commentId);
    }

    loadComments()
    {
        this.autoLoadComments = true;
        this.videoService.getVideoComments(this.selectedVideoId);
        this.videoComments$ = this.videoService.videoComment$;
        this.videoComments$.subscribe(data =>
          this.videoCommentsSnapshot = data
        )
        var userId : string | null = null;
        this.userNameAsObservable.subscribe((data)=>
          {
            userId = data;

            if(userId !== null)
        {
            this.videoService.getUserCommentLikesDislikes(this.selectedVideoId)
            .subscribe
            (
              {
                next : (data) =>
                {
                    for(var commentReaction of data)//Possible source of why another user delets anothers likes and dislikes
                    {

                      this.videoService.userCommentReactions[commentReaction.commentId] = commentReaction.like;
                    }

                }
                ,
                error : (error) =>
                {
                    console.error(`Error while getting the userCommentReactions`, error)
                }

              }
            )
        }
          })


    }

    toggleCommentsShowHide()
    {
      this.autoLoadComments = !this.autoLoadComments;
    }

    navigateToLogIn()
    {
        this.nagivationService.updateAdress(this.router.url);
        console.log(`Changing router to ${this.router.url}`);

        this.router.navigate(['login']);
    }

    getReplyForm(commentId : number)
    {
        if(this.activeCommentId !== commentId)
        {
          this.activeCommentId = commentId;
          this.replyForm = this.formBuilder.group(
            {
              Reply : ["", [Validators.required]]
            });
        }
        else
        {
            this.activeCommentId = undefined;
            this.replyForm = undefined;
        }

    }


    getRepliesForCommnet(commentId : number)
    {
      if(this.expandRepliesComments[commentId])
      {
        this.expandRepliesComments[commentId] = false;
        return;
      }


      if(!this.commentReplies$[commentId])
      {
          this.commentReplies$[commentId] = this.videoService.getCommentReplies(this.selectedVideoId, commentId);
      }

      this.expandRepliesComments[commentId] = true;

      this.videoService.getUserRepliesReactions(commentId)
      .subscribe(
        {
          next : (data) =>
          {
            for(var replyReaction of data)
            {
                this.videoService.userReplyReactions[replyReaction.replyId] = replyReaction.like;
            }

          }
        }
      )

    }

    addReplyReaction(commentId : number, replyId : number , reaction : boolean)
    {
        if(this.userName === null) return;

        if(!this.videoService.userReplyReactions.hasOwnProperty(replyId))//Make a reaction
        {
            this.createReplyReaction(commentId, replyId , reaction);
        }
        else if(this.videoService.userReplyReactions[replyId] === reaction)//delete/neutral reaction
        {
            this.deleteReplyReaction(commentId, replyId);
        }
        else
        {
            this.updateReplyReaction(commentId, replyId, reaction);
        }
    }

    private createReplyReaction(commentId : number, replyId : number , reaction : boolean)
    {
        this.videoService.addUpdateReplyReaction(replyId, reaction)
        .subscribe(
          {
            next : (data) =>
            {
              this.videoService.userReplyReactions[replyId] = reaction

              this.updateReplyLikeDislikeCounts(commentId ,replyId ,data)
            }
          })
    }

    private deleteReplyReaction(commentId : number, replyId : number )
    {
        this.videoService.deleteUserReplyReaction(replyId)
        .subscribe(
          {
            next : (data) =>
            {
              delete this.videoService.userReplyReactions[replyId];

              this.updateReplyLikeDislikeCounts(commentId ,replyId ,data)
            }
          }
        )
    }

    private updateReplyReaction(commentId : number, replyId : number , reaction : boolean)
    {
        this.videoService.addUpdateReplyReaction(replyId, reaction)
        .subscribe(
          {
            next : (replyLikeDislikeCountUpdateDTO) =>
            {
              this.videoService.userReplyReactions[replyId] = reaction

              this.updateReplyLikeDislikeCounts(commentId ,replyId ,replyLikeDislikeCountUpdateDTO)
            }
          })
    }

    private updateReplyLikeDislikeCounts(commentId : number , replyId : number, replyLikeDislikeCountUpdateDTO : ReplyLikeDislikeCountUpdateDTO)
    {
        const repliesObservable = this.commentReplies$[commentId]

        if(!repliesObservable)
        {
          return;
        }

        repliesObservable
        .pipe(take(1)) // take the current snapshot, don't keep subscribing
      .subscribe(replies => {
      const reply = replies.find(r => r.id === replyId);
      if (reply) {
        reply.likes = replyLikeDislikeCountUpdateDTO.likeCount;
        reply.disLikes = replyLikeDislikeCountUpdateDTO.dislikeCount;
      }
    });
    }

    addReply()
    {
        if(this.replyForm?.invalid)
        {
            console.error("Invalid reply form");

        }
        else
        {
          if(this.userName && this.activeCommentId)
          {
            let reply : ReplyForm =
            {
              userName : this.userName,
              replyContent : this.replyForm?.value.Reply,
              videoId : this.selectedVideoId,
              commentId : this.activeCommentId
            }

            this.videoService.addReplyToComment(reply).subscribe(
            {
                next : (result) =>
                {
                  console.log(`User ${result.userName} replied : ${result.replyContent} to comment with id ${result.commentId} in video with id ${result.videoId}`);
                  if(this.activeCommentReplyId !== undefined)
                  {
                    let cloneActiveCommentsreplyId = this.activeCommentReplyId;
                    this.activeCommentReplyId = undefined;
                    //this is some dog ass code but it got the job done
                    this.getRepliesForCommnet(cloneActiveCommentsreplyId);
                  }
                }
            });

            this.replyForm?.reset();
          }



        }
    }

    loadReactions()
    {


       this.videoService.getVideoReactions(this.selectedVideoId)
       .subscribe(data =>
       {
          this.reaction = data;

       }
       )
    }

    addReaction(reactionClicked : string)
    {
         var currentUser : string | null = null;
         this.userNameAsObservable.subscribe(
          {
            next : (name) =>
              {
                currentUser = name;
              }
          })


         if(currentUser === null)
         {
            return;
         }

         if(this.reaction?.reaction === reactionClicked)
          {

            this.videoService.deleteVideoReaction(this.selectedVideoId)
            .subscribe(
              {
                next : (data) =>
                {
                    this.reaction = data;
                }
                ,
                error : (err) =>
                {
                  console.error("Error while deleting", err)
                }

              }
            )
          }
          else
          {
            this.videoService.addOrUpdateVideoReaction(this.selectedVideoId, reactionClicked)
            .subscribe(
              {
                next : (data) =>
                {
                  this.reaction = data;
                }
                ,
                error : (err) =>
                {
                  console.error("Error while reacting", err)
                }
              }
            )

          }
    }






























}
