import { Component, ElementRef, HostListener, Inject, inject, ViewChild} from '@angular/core';
import { VideoService } from '../video.service';
import { PlayVideo } from '../models/play-video';
import { ActivatedRoute } from '@angular/router';
import { FormGroup, FormBuilder, Validators, RequiredValidator } from '@angular/forms';
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
import { WatchHistoryVideoInfo } from '../models/watch-history-video-info';


@Component({
  selector: 'app-play-video',
  standalone: false,

  templateUrl: './play-video.component.html',
  styleUrl: './play-video.component.scss'
})
export class PlayVideoComponent
{
    selectedVideo : PlayVideo | null = null;
    selectedVideoId : number;
    commentForm : FormGroup;
    replyForm? : FormGroup;
    replyCommentId? : number;


    activeCommentReplyThreadDictionary = new Map<number , FormGroup>();


    activeReplyThreadDictionary = new Map<number , FormGroup>();
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

    videoCommentsSnapshot: VideoComment[] = [];//probably needs to be removed

    public sortMenuOpen : boolean = false;
    public criteria : 'popular' | 'newest' = 'newest';

    @ViewChild('sortWrapper', {static : false}) sortWrapper? : ElementRef //this makes a dom element to a variable



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

        if(this.userName !== null)
        {
          this.authService.userTodayWatchHistory$
          .pipe(take(1))
          .subscribe(history =>
            {
              const exists = history.find(h => h.videoId == this.selectedVideoId)


              this.videoService.addUpdateUserWatchHistory(this.selectedVideoId)
                .subscribe(
                {
                    next : (data) =>
                    {
                      let updatedWatchedHistory : WatchHistoryVideoInfo[];
                      if(!exists)
                      {
                          data.watchedOn = new Date(data.watchedOn);
                          updatedWatchedHistory = [...history, data];

                      }
                      else
                      {
                          let index = history.findIndex(h => h.videoId === this.selectedVideoId);

                          const [topElement] = history.splice(index,1);

                          topElement.watchedOn = new Date(data.watchedOn);

                          updatedWatchedHistory = [topElement, ...history]

                      }

                      this.authService.userTodayWatchHistorySubject.next(updatedWatchedHistory);


                    }
                })

            })


        }

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

    loadComments()//THIS WOULD BE SO MUCH BETTER IF I REWRITE IT
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
    //getReplyForm and GetReplyFormOverLoad require a total rewrite since youtube allows for mutliple forms to be open
    getReplyForm(commentId : number | undefined , replyId : number | undefined)
    {

      if(replyId !== undefined && !this.activeReplyThreadDictionary.has(replyId))
      {
        const form = this.formBuilder.group(
          {
            Reply : ["", [Validators.required]]
          }
        )

        this.activeReplyThreadDictionary.set(replyId, form)
      }

      else if(commentId !== undefined && !this.activeCommentReplyThreadDictionary.has(commentId))
      {
        const form = this.formBuilder.group(
          {
            Reply : ["",[Validators.required]]
          }
        )

        this.activeCommentReplyThreadDictionary.set(commentId, form);
      }
    }

    cancelReplyForm(commentId : number | undefined , replyId : number | undefined)//WHAT THE FUCK this shit is wrong
    {
      if(commentId !== undefined && this.activeCommentReplyThreadDictionary.has(commentId))
      {
        this.activeCommentReplyThreadDictionary.delete(commentId)
      }

      else if (replyId !== undefined && this.activeReplyThreadDictionary.has(replyId))
      {
        this.activeReplyThreadDictionary.delete(replyId);
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

      if(this.userName !== null)
      {
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

    addReply(commentId : number, replyId : number | undefined)//This is being rewritten so check carefully
    {
        let form : FormGroup;

        if(replyId !== null && this.activeReplyThreadDictionary.has(replyId!))
        {
            form = this.activeReplyThreadDictionary.get(replyId!)!;//two fucking !! this language is so trash
        }
        else if (this.activeCommentReplyThreadDictionary.has(commentId))
        {
            form = this.activeCommentReplyThreadDictionary.get(commentId)!;
        }
        else
        {
          console.error(`Massive Error at function AddReply. Form for comment with ${commentId} or reply with ${replyId} was not found`)
          return;
        }

        if(form?.invalid)
        {
            console.error("Invalid reply form");

        }
        else
        {
          if(this.userName)
          {
            let reply : ReplyForm =
            {
              userName : this.userName,
              replyContent : form.value.Reply,
              videoId : this.selectedVideoId,
              commentId : commentId,
              uploaded : new Date()
            }

            this.videoService.addReplyToComment(reply).subscribe(
            {
                next : (newReply) =>
                {
                  console.log(`User ${newReply.userName} replied : ${newReply.description} to comment with id ${newReply.commentId} in video with id ${newReply.videoRecordId}`);

                  newReply.uploaded = new Date(newReply.uploaded);

                  this.videoService.updateCommentRepliesSubject(commentId, newReply);
                  this.videoService.increaseClientSideCommentReplyCount(commentId , this.videoComments$);
                  this.videoService.locallyUpdateCommentCountAfterUserReply();
                  // this.updateLocalyCommentReplyOnUser(commentId) probably don t need


                  this.cancelReplyForm(commentId , replyId);
                }
            });


          }



        }
    }

    updateLocalyCommentReplyOnUser(commentId : number)
    {
        const repliesUnderComment = this.commentReplies$[commentId];

        repliesUnderComment.subscribe(
          {
            next :(replies) =>
            {

            }
          }
        )
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

    areaAutoGrowth(event : Event) :  void
    {
        const textArea = event.target as HTMLTextAreaElement;
        textArea.style.height = 'auto';//if user removes text this sets it back to it original height
        textArea.style.height = textArea.scrollHeight + 'px';
    }

    toggleSortMenu()
    {
      this.sortMenuOpen = !this.sortMenuOpen;
    }

    sortComments(criteria : 'popular' | 'newest')
    {
        this.sortMenuOpen = !this.sortMenuOpen;

        this.videoComments$?.subscribe(
          {
            next : (data) =>
            {
              if(criteria === 'newest')
              {

                data = data.sort((a,b)=> b.uploaded.getTime() - a.uploaded.getTime());
              }
              else if(criteria === 'popular')
              {
                data = data.sort((a,b)=> b.likes - a.likes);
              }

              this.videoService.sortCommentsForBehaviorSubject(data);

            }
          }
        )

    }

    @HostListener('document:click', ['$event'])
    handleOutsideClick(event : MouseEvent)
    {
       if(this.sortMenuOpen
        && this.sortWrapper
        && !this.sortWrapper.nativeElement.contains(event.target))
       {
          this.sortMenuOpen = false;
       }
    }

    @HostListener('window:keydown', ['$event'])
    sortButtonEscapeKeyPressEvent(event : KeyboardEvent)
    {
      if(this.sortMenuOpen && event.key === 'Escape')
      {
        this.sortMenuOpen = false;
      }
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





































