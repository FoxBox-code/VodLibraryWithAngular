import { Component, Inject, inject} from '@angular/core';
import { VideoService } from '../video.service';
import { PlayVideo } from '../models/play-video';
import { ActivatedRoute } from '@angular/router';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Observable } from 'rxjs';
import { NavigationService } from '../navigation.service';
import { Router } from '@angular/router';
import { AddCommentDTO } from '../models/add-comment';
import { VideoComment } from '../models/comment';
import { ReplyForm } from '../models/reply-form';
import { Reply } from '../models/reply';
import { Reaction } from '../models/reaction';


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

    loadComments()
    {
        this.autoLoadComments = true;
        this.videoService.getVideoComments(this.selectedVideoId);
        this.videoComments$ = this.videoService.videoComment$;
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
         var currentUser = this.userName;

         if(currentUser === null)
         {
            return;
         }

         if(this.reaction?.userReact === reactionClicked)
         {

              this.reaction.userReact = `None`;// We have to delete the table from here
              this.videoService.deleteVideoReaction(this.selectedVideoId)
              .subscribe(() =>
              {
                if(this.reaction)
                {
                    this.reaction.userReact = `None`;

                    if(reactionClicked === "Like")
                        this.reaction.likeCount -= 1;

                    else
                        this.reaction.dislikeCount -=1;
                }

              }
              )


          }
          else
          {
            this.videoService.addOrUpdateVideoReaction(this.selectedVideoId, reactionClicked)
            .subscribe(() =>
            {
              if(this.reaction?.userReact === "Like")
              {
                this.reaction.likeCount -= 1;
              }
              else if(this.reaction?.userReact === "Dislike")
              {
                this.reaction.dislikeCount -= 1;
              }

              this.reaction!.userReact = reactionClicked //Reaction should be not null here but mark it as potential error harbinger

              if(this.reaction?.userReact === "Like")
                  this.reaction.likeCount +=1;
              else if(this.reaction?.userReact === "Dislike")
                  this.reaction.dislikeCount +=1;

            })



          }



    }














}
