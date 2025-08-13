import { Component, ElementRef, HostListener, Inject, inject, ViewChild} from '@angular/core';
import { VideoService } from '../video.service';
import { PlayVideo } from '../models/play-video';
import { ActivatedRoute } from '@angular/router';
import { FormGroup, FormBuilder, Validators, RequiredValidator } from '@angular/forms';
import { AuthService } from '../auth.service';
import { BehaviorSubject, firstValueFrom, Observable, of, pipe, Subject } from 'rxjs';
import { take } from 'rxjs/operators';

import { NavigationService } from '../navigation.service';
import { Router } from '@angular/router';
import { AddCommentDTO } from '../models/add-CommentDTO';
import { VideoComment } from '../models/videoComment';
import { ReplyForm } from '../models/reply-form';
import { Reply } from '../models/reply';
import { Reaction } from '../models/reaction';
import { ReplyLikeDislikeCountUpdateDTO } from '../models/replyLikeDislikeCountUpdateDTO';
import { WatchHistoryVideoInfo } from '../models/watch-history-video-info';
import { ProfilesFollowingDTO } from '../models/profiles-followingDTO';
import { VideoWindow } from '../models/video-window';
import { PlayListMapper } from '../models/playListMaper';
import { PlaylistService } from '../playlist.service';
import { VideoLikeDislikeCountDTO } from '../models/video-like-dislike-countDTO';
import { CategoryStatsDTO } from '../models/categorystatsDTO';



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

    replyCommentId? : number;
    currentUserId : string | null = null;

    activeCommentReplyThreadDictionary = new Map<number , FormGroup>();


    activeReplyThreadDictionary = new Map<number , FormGroup>();

    unRegisteredUserWantsToSubscribe = false;

    commentsCountSubject = new BehaviorSubject<number>(0);
    commentsCountObservable = this.commentsCountSubject.asObservable();
    public userCommentReactions: { [commentId: number]: boolean | undefined } = {};

    public userReplyReactions : {[replyId : number] : boolean | undefined} = {};


    userNameAsObservable : Observable<string | null>;
    userName : string | null = null;
    navigationService = inject(NavigationService);
    router = inject(Router);


    commentReplies$ : {[commentId : number] :Observable<Reply[]>} = {};
    isUserClickingCommentForm : boolean = false;
    selectedComment : number = 0;
    selectedReply : number = 0;
    expandRepliesComments : {[commentId : number] :  boolean} = {};
    autoLoadComments : boolean = false;
    views$? : Observable<number>;

    userWatchedEnoughTimeForViewToCount : boolean = false;

    userVideoReaction? : Reaction;
    likeDislike : VideoLikeDislikeCountDTO | null = null;//THIS SHOULD NEVER BE NULL we ust did it for type safety

    public videoCommentsSubject = new BehaviorSubject<VideoComment[]>([]);
    public videoComments$$ = this.videoCommentsSubject.asObservable();

    public sortMenuOpen : boolean = false;
    public criteria : 'popular' | 'newest' = 'newest';
    public userFollowing$ : Observable<ProfilesFollowingDTO[] | null> ;
    public userFollowing : ProfilesFollowingDTO[] = [];
    public hasUserSubscribedToVideoOwner : boolean = false;

    public loadPlayList : string | null= null;
    public playList : VideoWindow[] | null = null;
    public playListMapper : PlayListMapper | null = null;

    public descriptionShowMore : boolean = false;
    public maxHeight : Number = 0;

    public unfollowUser = false;//unsubscribing is done via two button confirmations

    public categoryStats : CategoryStatsDTO | null = null;

    @ViewChild('sortWrapper', {static : false}) sortWrapper? : ElementRef //this makes a dom element to a variable
    @ViewChild('videoElement') videoElement! : ElementRef<HTMLVideoElement>
    @ViewChild('description') description! : ElementRef<HTMLElement>



    constructor(private videoService : VideoService,
      private activatedRoute:ActivatedRoute,
      private formBuilder : FormBuilder,
      private authService : AuthService,
      private playListService : PlaylistService,


      )
    {
        this.selectedVideoId = Number(this.activatedRoute.snapshot.paramMap.get('id'));
        this.loadPlayList = (this.activatedRoute.snapshot.queryParamMap.get('showPlayList'));
        const giveMeSomething = this.activatedRoute.snapshot.queryParamMap.get('showPlayList');


        // this.getVideo(this.selectedVideoId);



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

          this.userFollowing$ = this.authService.userFollowing$;


   }



  ngOnInit() : void
  {
        this.activatedRoute.params.subscribe(
          {
            next : (params) =>
            {
              const id = +params['id'];
              this.selectedVideoId = id;//this shit is a mess

              this.getVideo(id);
              this.resetDependenciesWhenPlayerSwitchesVideos();


            }
          }
        )

        this.loadLikeDislikeCount()

        if(this.userName)
            this.loadReactions();




        this.currentUserId = this.authService.getUserIdFromToken();

        if(this.loadPlayList === "true")
        {
          this.playListService.getLikedListMini().subscribe(data => this.playListMapper = data)
          this.videoService.getUsersLikedVideosHistory()
          .subscribe(
            {
              next : (list) =>
              {
                this.playList = list;
              },
              error : (err) =>
              {
                console.error(err);
              }
            }
          )
        }



    }

    ngAfterViewInit()
    {
      const video = this.videoElement.nativeElement;


        //Timeupdate is an event tha hanldes media elements it thicks time only when the video is playing making it useful for trakcing
        video.addEventListener('timeupdate', () =>
        {
            const videoTime = video.duration;
            const currentTime = video.currentTime;

            if(!this.userWatchedEnoughTimeForViewToCount && currentTime >= 20)
            {
              this.userWatchedEnoughTimeForViewToCount = true;//SUCH A TRASH VARIABLE
              this.videoService.updateViews(this.selectedVideo!.id).subscribe({
                next : () =>
                  {
                    console.log("View counted");


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
              })


            }

            if(this.loadPlayList !== null && currentTime >= videoTime)
            {
              const nextVideo = this.playListMapper?.currentNode?.next;

              if(nextVideo)
              {
                this.playListMapper!.currentNode = nextVideo;
                 this.router.navigate(['/playing', nextVideo.value.videoId], {queryParams : {showPlayList : true }});
              }
            }
          });

          setTimeout(() => {
              this.measureDescription();
          }, 0);




    }

    private measureDescription()
    {
      const element = this.description.nativeElement;

      const full = element.scrollHeight;




      this.maxHeight = (full * 40)/100;
    }

    showHideDescription(event : Event, descriptionContainer : HTMLElement)
    {
      this.descriptionShowMore = !this.descriptionShowMore;
      // const full = descriptionContainer.scrollHeight;
      const full = this.description.nativeElement.scrollHeight;

      if(this.descriptionShowMore)
      {
          this.maxHeight = full;
          descriptionContainer.style.overflow = "auto";
      }


      else
      {
        descriptionContainer.style.overflow = "hidden";
        this.maxHeight = (full * 40)/100;
      }

    }




     getVideo(selectedVideoId : number)
   {
      this.videoService.getCurrentVideo(selectedVideoId).subscribe(
        {
            next : (result) =>
            {
                this.selectedVideo = result;
                console.log(JSON.stringify(this.selectedVideo));
                this.commentsCountSubject.next(this.selectedVideo.commentCount);

                this.getUserFollowersForThisPage();
                this.requestCategoryStats(selectedVideoId);
            }



        })
   }

   private requestCategoryStats(videoId : number)
   {
    this.videoService.getCategoryStatsInViedoDescription(videoId).subscribe(
      {
        next : (data) => this.categoryStats = data,
        error : (err) => console.error(err)
      }
    )
   }

  //  loadNewVideo(playListMapper : PlayListMapper)
  //  {
  //    this.playListMapper = playListMapper;
  //     this.getVideo(playListMapper.selectedVideoId);

  //     this.videoService.videoCommentsSubject.next([]);
  //  }


   private async getUserFollowersForThisPage()
   {

       const ProfilesFollowingasyncResult = await firstValueFrom(this.userFollowing$.pipe(take(1)));
       if(ProfilesFollowingasyncResult === null)
       {
          console.error("getUserFollowersForThisPage is not working correctly, the observable userFOllowing$ returned a null");
          return;
       }
       this.userFollowing = ProfilesFollowingasyncResult as ProfilesFollowingDTO[];//THIS MIGHT BE A PROBLEM

       if(this.userFollowing.length === 0)
       {
         const userFollowingFromStorage = sessionStorage.getItem('userFollowing');
         const userFollowingFromStorageParse : ProfilesFollowingDTO[] = userFollowingFromStorage ? JSON.parse(userFollowingFromStorage) : []

         if(userFollowingFromStorageParse.length !== 0)
         {
            this.authService.updateSubjectForUserFollowing(userFollowingFromStorageParse);
            this.hasUserSubscribedToVideoOwner = userFollowingFromStorageParse?.some(x => x.id == this.selectedVideo?.videoOwnerId) ?? false;
            console.log(`What is the state of hasUserSubscribedToVideoOwner :${this.hasUserSubscribedToVideoOwner}`);
            return;
         }
        }
        this.hasUserSubscribedToVideoOwner = ProfilesFollowingasyncResult?.some(x => x.id == this.selectedVideo?.videoOwnerId) ?? false;
        console.log(`What is the state of hasUserSubscribedToVideoOwner: ${this.hasUserSubscribedToVideoOwner}`);

      }

  private resetDependenciesWhenPlayerSwitchesVideos()
  {
      this.videoService.videoCommentsSubject.next([]);

      this.activeCommentReplyThreadDictionary = new Map<number , FormGroup>();

      this.activeReplyThreadDictionary = new Map<number , FormGroup>();

      this.commentForm.reset();

      this.commentReplies$ = {};
      this.expandRepliesComments = {}




  }

    commentFormClicked()
    {
        this.isUserClickingCommentForm = true;
    }

    cancelUserComment()
    {
      this.commentForm.reset();
      this.isUserClickingCommentForm = false;
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
                    this.commentsCountSubject.next(this.commentsCountSubject.value + 1);


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

    addCommentReaction(commentId : number, reaction : boolean, individualComment?: HTMLElement)
    {
      this.selectedComment = commentId;
      this.userNameAsObservable.subscribe(next => console.log(`Printing whats inside userName as observable ${next}`))
      if(this.userName === null)
        {

          return;
        }

      this.userCommentReactions = this.videoService.userCommentReactions;
      console.log(`Current reaction of user for this comment is ${this.userCommentReactions[commentId]}`)
      const exists = this.userCommentReactions[commentId];

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

    leaveLogInMessage()
    {
        this.selectedComment = 0;

    }

    private createCommentReaction(commentId : number , reaction : boolean)
    {
        this.videoService.addUpdateUserCommentReaction(commentId, reaction)
        .subscribe(result => {
        this.videoService.userCommentReactions[commentId] = result.like;
        this.userCommentReactions = this.videoService.userCommentReactions;
        this.updateCommentCounts(commentId, result.likeCount, result.dislikeCount);
    });
    }
    private deleteCommentReaction(commentId : number)
    {
        this.videoService.deleteUserCommentReaction(commentId)
        .subscribe(result => {
        delete this.videoService.userCommentReactions[commentId];
        this.userCommentReactions = this.videoService.userCommentReactions;
        this.updateCommentCounts(commentId, result.likeCount, result.dislikeCount);
    });
    }
    private updateCommentReaction(commentId: number, reaction: boolean)
    {
        this.videoService.addUpdateUserCommentReaction(commentId, reaction)
      .subscribe(result => {
      this.videoService.userCommentReactions[commentId] = result.like;
      this.userCommentReactions = this.videoService.userCommentReactions;

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




    findComment(commentId: number) : VideoComment | undefined //REMOVE THIS LATER
    {
      const comments = this.videoCommentsSubject.getValue();
      return comments.find(c => c.id === commentId);
    }

    loadComments()//THIS WOULD BE SO MUCH BETTER IF I REWRITE IT
    {

        this.autoLoadComments = true;
        this.videoService.getVideoComments(this.selectedVideoId).subscribe(
      {
          next : (result) =>
          {
              result = result.map(x => (
                {
                  ...x,
                  uploaded : new Date(x.uploaded)
                }
              ))
              this.videoCommentsSubject.next(result);
          },
          error : (error) =>
          {
              console.error("Could not retrive the commets from the server", error);

          }
      });




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
                    for(var commentReaction of data)
                    {

                      this.videoService.userCommentReactions[commentReaction.commentId] = commentReaction.like;
                      this.userCommentReactions = this.videoService.userCommentReactions;
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

        const param = this.activatedRoute.snapshot.paramMap.get('id');
        const query = this.activatedRoute.snapshot.queryParamMap.get('showPlayList');
        const bool = query === 'true';
        const route =
        {
          path : ['/playing', param],
          querryParam : { ["showPlayList"]  : bool }
        }


        this.navigationService.updateAdress(route);


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



        this.activeReplyThreadDictionary.set(replyId, form);
        //this is for nested reply - replies
      }

      else if(commentId !== undefined && !this.activeCommentReplyThreadDictionary.has(commentId))
      {
        const form = this.formBuilder.group(
          {
            Reply : ["",[Validators.required]]
          }
        )
        //my god this function is so ass , this dic can open multiple comment reply forms
        this.activeCommentReplyThreadDictionary.set(commentId, form);
      }
    }

    cancelReplyForm(commentId : number | undefined , replyId : number | undefined)
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
                this.userReplyReactions = this.videoService.userReplyReactions;
            }

          }
        }
      )
      }



    }

    addReplyReaction(commentId : number, replyId : number , reaction : boolean)
    {
        this.selectedReply = replyId;
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

    deSelectCommentAndReply()
    {
      this.selectedComment = 0;
      this.selectedReply = 0;
    }

    private createReplyReaction(commentId : number, replyId : number , reaction : boolean)
    {
        this.videoService.addUpdateReplyReaction(replyId, reaction)
        .subscribe(
          {
            next : (data) =>
            {
              this.videoService.userReplyReactions[replyId] = reaction
              this.userReplyReactions = this.videoService.userReplyReactions

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
              this.userReplyReactions = this.videoService.userReplyReactions

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
              this.userReplyReactions = this.videoService.userReplyReactions

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
                  this.increaseClientSideCommentReplyCount(commentId);
                  this.videoService.locallyUpdateCommentCountAfterUserReply();//probably delete
                  // this.updateLocalyCommentReplyOnUser(commentId) probably don t need
                  this.commentsCountSubject.next(this.commentsCountSubject.value + 1);


                  this.cancelReplyForm(commentId , replyId);
                }
            });


          }



        }
    }

    increaseClientSideCommentReplyCount(commentId : number| undefined)
  {
    const comments = this.videoCommentsSubject.getValue();

    const upDatedComments = comments.map(comment =>
      comment.id === commentId ? {...comment, repliesCount : comment.repliesCount + 1} : comment
    );


    this.videoCommentsSubject.next(upDatedComments);
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
          this.userVideoReaction = data;

      }
      )
    }

    loadLikeDislikeCount()
    {
      const videoIdFromUrl = parseInt(this.activatedRoute.snapshot.paramMap.get('id') ?? '-1');

      this.videoService.getVideoLikesDislikeCount(videoIdFromUrl)
      .subscribe(
        {
          next : (data) =>
          {
            this.likeDislike = data;

            console.log(this.likeDislike);
            console.log(`Like ${this.likeDislike.likes}`);
            console.log(`Dislike ${this.likeDislike.dislikes}`);
          },
          error : (err) =>
          {
            console.error(err)
          }
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

        this.videoComments$$?.subscribe(
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

    async addReaction(reactionClicked : string)
    {
        var currentUser : string | null = null;
        currentUser = await firstValueFrom(this.userNameAsObservable)



        if(currentUser === null)
        {
            return;
        }


        if(this.userVideoReaction?.reaction === reactionClicked)
          {

            this.videoService.deleteVideoReaction(this.selectedVideoId)
            .subscribe(
              {
                next : (data) =>
                {
                    this.userVideoReaction = data;
                    this.likeDislike!.likes = data.likeCount;
                    this.likeDislike!.dislikes = data.disLikeCount;

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
                  this.userVideoReaction = data;
                  this.likeDislike!.likes = data.likeCount;
                  this.likeDislike!.dislikes = data.disLikeCount;

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



        public subscribeToUser()
        {
          const subscribingTo = this.selectedVideo?.videoOwnerId;
          const theCurrentUserId = this.authService.getUserIdFromToken();

          const userName = this.authService.getUserNameFromToken();

          if(userName === null)
          {
            this.unRegisteredUserWantsToSubscribe = true;
            return;
          }
          const videoOwner = this.selectedVideo?.videoOwnerName;

          if(!this.hasUserSubscribedToVideoOwner)
          {
            if(theCurrentUserId && userName && subscribingTo && videoOwner)
            {




              const newProfileFollowingDTO : ProfilesFollowingDTO =
              {
                userName : this.selectedVideo!.videoOwnerName,
                id : this.selectedVideo!.videoOwnerId,
                subscribedOn : new Date(),
                uesrImageIcon : this.selectedVideo!.videoOwnerProfileIcon//No way video is not selected here

              }
              this.userFollowing.push(newProfileFollowingDTO);



              this.authService.updateSubjectForUserFollowing(this.userFollowing);
              sessionStorage.setItem('userFollowing', JSON.stringify(this.userFollowing))

              this.videoService.subscribeUserToVideoOwner(theCurrentUserId , userName, subscribingTo, videoOwner)
              .subscribe(
                {
                    next : () =>
                    {
                      console.log(`Server returned succsess`);
                      this.hasUserSubscribedToVideoOwner = true;
                    },
                    error : (err) =>
                      {
                        console.error(err);
                        if(err.status = 400)
                        {
                          //UH WTF IS THIS SHIT
                            this.hasUserSubscribedToVideoOwner = true;//status 400 from the server means that a duplicate subscription was made
                            this.removeSubscription()
                        }

                      }
                }
              );

            }
          }



        }

        public unSubscribeFromUser()
        {
            const subscribingTo = this.selectedVideo?.videoOwnerId;
            const theCurrentUserId = this.authService.getUserIdFromToken();

            const userName = this.authService.getUserNameFromToken();
            const videoOwner = this.selectedVideo?.videoOwnerName;

            this.removeSubscription()
            this.hasUserSubscribedToVideoOwner = false;

            if(theCurrentUserId && userName && subscribingTo && videoOwner)
                this.videoService.unSubscribeUserToVideoOwner(theCurrentUserId , userName, subscribingTo, videoOwner)
                .subscribe({
                  next : () =>
                  {
                      console.log(`${userName} unfollowed ${videoOwner}`);
                      this.unfollowUser = false;
                  },
                  error : (err) => console.log(err)
                });
        }


          private removeSubscription()
          {
            const currentSubList = JSON.parse(sessionStorage.getItem('userFollowing') ?? '') as ProfilesFollowingDTO[];

            const hashSet = new Set();


            const filteredCurrentSubList = currentSubList.filter(x => x.id !== this.selectedVideo?.videoOwnerId)


            sessionStorage.setItem('userFollowing', JSON.stringify(filteredCurrentSubList));
            this.authService.updateSubjectForUserFollowing(filteredCurrentSubList);
          }

          formatNum(views : number)
          {

            if(Math.floor(views / 1_000_000) > 0)
              return Math.floor(views / 1_000_000) + 'M'

            else if(Math.floor(views / 1_000) > 0)
              return Math.floor(views / 1_000) + 'K'

            return views
          }

          formatDateTime(date : Date)
          {
            const newDate = new Date();

            if(newDate.getFullYear() === date.getFullYear())
            {
              if(newDate.getMonth() === date.getMonth())
              {
                if(newDate.getDay() === date.getDay())
                {
                  if(newDate.getHours() === date.getHours())
                  {
                    const minutesGap = newDate.getMinutes() - date.getMinutes();
                    return minutesGap === 1 ? minutesGap + ' minute ago' : minutesGap + ' minutes ago'
                  }
                  const hourGap = newDate.getHours() - date.getHours();
                  return hourGap === 1 ? hourGap + ' hour ago' : hourGap + ' hours ago'
                }
                const daysGap = newDate.getMonth() - date.getMonth();
                return daysGap === 1 ? daysGap + ' day ago' : daysGap + ' days ago'
              }
              const monthGap = newDate.getMonth() - date.getMonth();
              return monthGap > 1 ? monthGap + ' months ago' : monthGap + ' month ago'
            }

            const yearGap = newDate.getFullYear() - date.getFullYear()
            return yearGap > 1 ? yearGap + ' years ago' : yearGap + ' year ago'
          }






  }



















































