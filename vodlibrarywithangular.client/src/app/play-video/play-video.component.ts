import { Component, ElementRef, HostListener, Inject, inject, ViewChild} from '@angular/core';
import { VideoService } from '../services/video.service';
import { PlayVideo } from '../models/play-video';
import { ActivatedRoute } from '@angular/router';
import { FormGroup, FormBuilder, Validators, RequiredValidator } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, firstValueFrom, interval, Observable, of, pipe, Subject } from 'rxjs';
import { first, map, take, takeUntil, timeout } from 'rxjs/operators';

import { NavigationService } from '../services/navigation.service';
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
import { PlaylistService } from '../services/playlist.service';
import { VideoLikeDislikeCountDTO } from '../models/video-like-dislike-countDTO';
import { CategoryStatsDTO } from '../models/categorystatsDTO';
import { DataCosntans } from '../dataconstants';
import { IsUserTypingService } from '../services/is-user-typing.service';
import DOMPurify from 'dompurify';
import { Title } from '@angular/platform-browser';
import { CommentService } from '../services/comment.service';
import { ReactionsService } from '../services/reactions.service';
import { HistoryService } from '../services/history.service';
import { SubscriptionService } from '../services/subscription.service';
import { FormattingService } from '../services/formatting.service';
import { commentCriteria } from '../types/comments-type';


type TooltipKey = 'playPause' | 'volume' | 'fullscreen' | 'volumeBar';

type CommentSegment = {
  type: 'text' | 'link' | 'timestamp';
  value: string;
};


const HOTKEY_LABELS : Record<TooltipKey, (playVideoComponent : PlayVideoComponent) => string > =
{
  playPause : (playvideoComponent) => playvideoComponent.videoElement.nativeElement.paused ? 'Play button (k)' : 'Pause button (k)',
  volume : (playvideoComponent) => playvideoComponent.videoVolume === 0 ? 'Unmute (m)' : 'Mute (m)',
  fullscreen : (playvideoComponent) => playvideoComponent.videoFullScreen ? 'Exit fullscreen (f)' : 'Fullscreen (f)',
  volumeBar : (playvideoComponent) => 'Volume'
}



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
    splitedDescription : string[] = [];

    videoVolume = 0.8;
    videoVolumeCounterMute = 0;
    videoPlayBackTime = 0;
    videoFullScreen = false;


    videoPlayBackOptios : { label : string , value : number}[] =
    [
      {label : '0.25x', value : 0.25},
      {label : '0.50x', value : 0.50},
      {label : 'normal', value : 1},
      {label : '1.5x', value : 1.5},
      {label : '2.0x', value : 2},
    ]
    videoDefaultSpeed = 1;

    holdTimeOut : any // class NodeJS.Timeout
    showVideoHud = false;
    videoPlayerUIActive = false;
    hoverButtonText : { text : string , top : number , left : number} | null = null

    hideUITimeOut : any //class NodeJs.Timeout;
    ClearIconAtCenterTimeOut : any ; //class NodeJs.Timeout;
    loadVideoMetaDataOnce = true;

    playButtonIcon = DataCosntans.playButtonIcon;
    pauseButtonIcon = DataCosntans.pauseButtonIcon;
    gearIcon = DataCosntans.gearIcon;
    higherVolumeIcon = DataCosntans.higherVolumeIcon;
    noVolumeIcon = DataCosntans.noVolumeIcon;
    smallVolumeIcon = DataCosntans.smallVolumeIcon;
    fastForwardIcon = DataCosntans.fastForwardIcon;
    rewindTimeForwardIcon = DataCosntans.rewindTimeForwardIcon;
    rewindTimeBackWardsIcon = DataCosntans.rewindTimeBackWardsIcon;


    fullScreenIcon = DataCosntans.fullScreenIcon;
    smallScreenIcon = DataCosntans.smallScreenIcon;

    videoIconAtCenterCurrent : string | null = null;
    videoSelectedSource : string | null = null;
    hovoredTime : number | null = null;
    hovoredPosition : number | null = null;
    hovoredPositionForFrame : number | null = null;
    frameXPosition = 0;
    frameYPosition = 0;

    replyCommentId? : number;
    currentUserId : string | null = null;

    activeCommentReplyThreadDictionary = new Map<number , FormGroup>();


    activeReplyThreadDictionary = new Map<number , FormGroup>();

    unRegisteredUserWantsToSubscribe = false;

    commentsCountSubject = new BehaviorSubject<number>(0);
    commentsCountObservable = this.commentsCountSubject.asObservable();
    commentRevealDate = false;
    commentToRevealId = 0;

    replyRevealDate = false;
    replyToRevealId = 0;

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
    skipTrackerForReplies : {[commendId : number] : number} = {};
    autoLoadComments : boolean = false;
    views$? : Observable<number>;

    userWatchedEnoughTimeForViewToCount : boolean = false;

    userVideoReaction? : Reaction;
      likeDislikeCounter : VideoLikeDislikeCountDTO | null = null;

    // public videoCommentsSubject = new BehaviorSubject<VideoComment[]>([]);
    // public videoComments$$ = this.videoCommentsSubject.asObservable();
    public videoComments$$ = new Observable<VideoComment[]>();

    public sortMenuOpen : boolean = false;
    public commentSortCriteria : commentCriteria = 'newest';
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





    buttonHoverKey : TooltipKey | null = null;
    buttonHoverMessage : string = '';

    hasUserActivatedInputField : boolean = false;

    private subjectDestroy$ = new Subject<void>();

    @ViewChild('sortWrapper', {static : false}) sortWrapper? : ElementRef //this makes a dom element to a variable
    @ViewChild('videoElement') videoElement! : ElementRef<HTMLVideoElement>
    @ViewChild('description') description! : ElementRef<HTMLElement>
    @ViewChild('commentLoadThreshold') commentLoadThreshold! : ElementRef<HTMLElement>
    @ViewChild('fullScreenWrapper') fullScreenWrapper! : ElementRef<HTMLDivElement>
    @ViewChild('selectPlayBackSpeed') selectPlayBackSpeed! : ElementRef<HTMLSelectElement>
    @ViewChild('videoQualitySettings') videoQualitySettings! : ElementRef<HTMLSelectElement>
    @ViewChild('individualComment') individualComment! : ElementRef<HTMLElement>
    @ViewChild('commentContainer') commentContainer! : ElementRef<HTMLElement>

    intersectionObserver! : IntersectionObserver;

    mouseHold = false;




    constructor(
      private videoService : VideoService,
      private activatedRoute:ActivatedRoute,
      private formBuilder : FormBuilder,
      private authService : AuthService,
      private playListService : PlaylistService,
      private isUserTypingService : IsUserTypingService,
      private titleService : Title,
      private commentService : CommentService,
      private reactionService : ReactionsService,
      private historyService : HistoryService,
      private subscriptionService : SubscriptionService,
      private formattingService : FormattingService



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
    this.videoComments$$ = this.commentService.videoComments$;

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

        this.SetUpVideoLikeDislikes();





        this.currentUserId = this.authService.getUserIdFromToken();

        if(this.loadPlayList === "true")
        {
          this.playListService.getLikedListMini().subscribe(data => this.playListMapper = data)
          this.historyService.getUserLikedHistory()
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


        this.isUserTypingService.isUserInTypingFieldSubject
        .pipe(takeUntil(this.subjectDestroy$))
        .subscribe(
          isInput =>
          {
            this.hasUserActivatedInputField = isInput;
          }
        )

    }

  private async SetUpVideoLikeDislikes() : Promise<void>
  {
    await this.loadLikeDislikeCount();


    if (this.userName)
      this.loadUserVideoReaction();
  }

    ngAfterViewInit()
    {
        this.videoPlayerEventListiners()

       setTimeout(() => {
              this.measureDescription();
              this.setUpIntersection();
          }, 1000);
    }

    ngOnDestroy()
    {
      if(this.intersectionObserver)
      {
        this.intersectionObserver.disconnect();
      }

      this.subjectDestroy$.next();
      this.subjectDestroy$.complete();

      this.commentService.clearCommentsState();
    }

    private videoPlayerEventListiners()
    {
        const video = this.videoElement.nativeElement;
        const videoWrapper = this.fullScreenWrapper.nativeElement;


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


                              this.historyService.addVideoToUsersWatchHistory(this.selectedVideoId)
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



          video.addEventListener('canplay', () =>
          {
            video.play();//LoadMetaData now fails to start the video correctly because , degen shit , use canPlay on video to finally check if you can start this garbage
          })
           video.addEventListener('mouseup', ()=>
          {
            if(!this.mouseHold)
              this.playPauseVideo(video);
          })

          video.addEventListener('dblclick', ()=>
          {
            const divElement = this.fullScreenWrapper.nativeElement as HTMLDivElement;
            this.changeScreenSize(divElement);
          })

          video.addEventListener("mousedown", () =>
          {
            // this.mouseHold = true;
            const lastIndex = this.videoPlayBackOptios.length;


            this.holdTimeOut = setTimeout(() => {
              console.log(`EVENT HOLD IS HAPPENING!!!`)
                video.playbackRate = this.videoPlayBackOptios[lastIndex-1].value;
                this.mouseHold = true;
                this.videoIconAtCenterCurrent = this.fastForwardIcon;
            }, 500);

          })
          video.addEventListener('click', ()=>
          {

             const selectSpeedElement = this.selectPlayBackSpeed.nativeElement;
             video.playbackRate = Number.parseFloat(selectSpeedElement.value);

            clearTimeout(this.holdTimeOut);
            this.mouseHold = false;
            this.clearIconAtCenterTimeOutFunc();

          })


          videoWrapper.addEventListener('mouseover', () =>
          {
            this.showVideoHud= true;


            this.resetVideoUITimer()
          })

          videoWrapper.addEventListener('mouseleave', () =>
          {
            this.showVideoHud= false;

          })
          videoWrapper.addEventListener('mousemove', () =>
          {
            this.showVideoHud = true;
            console.log(`mouuseMouve event started current shovideoHud status ${this.showVideoHud}`);

            this.resetVideoUITimer();
          })




          // setTimeout(() => {
          //   const selectSpeedElement = this.selectPlayBackSpeed.nativeElement as HTMLSelectElement;
          //   console.log(`Is the video loaeded right now!!!!!!!!!!!!! ${video}`)
          //   console.log("🎥 Video Debug Info:");
          //   console.log(`video.readyState = ${video.readyState}`); // 0 to 4
          //   console.log(`video.networkState = ${video.networkState}`); // 0 to 3
          //   console.log(`video.duration = ${video.duration}`); // should be > 0 when ready
          //   console.log(`video.currentSrc = ${video.currentSrc}`);
          //   console.log(`video.paused = ${video.paused}`);
          //   console.log(`video.ended = ${video.ended}`);
          //   console.log(video);
          //   selectSpeedElement.value = "2"
          //   video.playbackRate = 2;
          // }, 100);

    }

    updateIsUserTypingVariable()
    {

      this.isUserTypingService.isUserInTypingFieldSubject.next(this.hasUserActivatedInputField);
    }

    @HostListener('document:keydown',['$event'])
    keyboardHotKeys(event : KeyboardEvent)
    {


      if(this.hasUserActivatedInputField) return

      const videoElement = this.videoElement.nativeElement;
      const fullScreenWrapper = this.fullScreenWrapper.nativeElement;
      if(event.key.toUpperCase() === 'K')
      {
        this.playPauseVideo(videoElement);
      }
      if(event.key.toUpperCase() === "F")
      {
        this.changeScreenSize(fullScreenWrapper);
      }

      if(event.key === 'ArrowLeft')
      {
        videoElement.currentTime -=5;
        this.videoIconAtCenterCurrent = this.rewindTimeBackWardsIcon;
        this.clearIconAtCenterTimeOutFunc();
      }
      if(event.key === "ArrowRight")
      {
        videoElement.currentTime +=5;
        this.videoIconAtCenterCurrent = this.rewindTimeForwardIcon;
        this.clearIconAtCenterTimeOutFunc();
      }

      if(event.key.toLocaleUpperCase() === 'M')
      {
        this.muteUnMuteAudio();


      }

      // event.preventDefault();
    }

    muteUnMuteAudio()
    {
         if(this.videoVolume !== 0)
        {
          this.videoVolumeCounterMute = this.videoVolume;
          this.videoVolume = 0;
        }
        else
          this.videoVolume = this.videoVolumeCounterMute;

        this.hoverButtonTextUpdate();
    }

    hovoredButtonTextFunc(toolType : TooltipKey , event : Event , controlBarActions: HTMLElement)
    {
      const element = event.target as HTMLElement;


      const rect = element.getBoundingClientRect();
      const parentRect = controlBarActions.getBoundingClientRect();

      // const correctLeft = (parentRect.left + parentRect.width) - rect.right;
      const correctLeft = parentRect.width - rect.left;
      const giveMe = HOTKEY_LABELS[toolType];
      this.buttonHoverKey = toolType;
      this.hoverButtonText =
      {
        top : -20,
        left : rect.left - parentRect.left,
        text : giveMe(this)
      }





    }
    hoverButtonTextUpdate()
    {
      if(this.hoverButtonText && this.buttonHoverKey)
        this.hoverButtonText.text = HOTKEY_LABELS[this.buttonHoverKey](this);
    }

    private resetVideoUITimer()
    {
      clearTimeout(this.hideUITimeOut)
      if(!this.videoPlayerUIActive)
        this.hideUITimeOut = setTimeout(() => {
          console.log(`How many times are we calling this setTimout`);
          this.showVideoHud = false;
        }, 3000);
    }
    private clearIconAtCenterTimeOutFunc()
    {
      clearTimeout(this.ClearIconAtCenterTimeOut);
      this.ClearIconAtCenterTimeOut = setTimeout(() =>
      {
        this.videoIconAtCenterCurrent = null;
      }, 500);
    }

    private setUpIntersection()
    {
        this.intersectionObserver = new IntersectionObserver((entry)=>
        {
          if(entry[0].isIntersecting)
          {
            console.log("WE MADE CONTACT")
            const countOfCurrentlyPulledComments = this.commentService.countOfCurrentlyPulledComments();
            if(countOfCurrentlyPulledComments !== this.selectedVideo?.commentCount)
              this.loadComments();
          }
        },
        {
          root : null,
          rootMargin : "100px 0px 0px 0px",
          threshold : 0.2
        })


        console.log(`HTML element ${this.commentLoadThreshold}`)
        if(this.commentLoadThreshold)
            this.intersectionObserver.observe(this.commentLoadThreshold.nativeElement);
    }
    private measureDescription()
    {
      const element = this.description.nativeElement;

      const full = element.scrollHeight;




      this.maxHeight = (full * 40)/100;
    }

    convertVideoTotalSecondsDurationToTimeFormat(totalSeconds : number)
    {
      return this.formattingService.convertVideoTotalSecondsDurationToTimeFormat(totalSeconds);

    }

    videoResolutionChange(event : Event)
    {
        const selectElement = event.target as HTMLSelectElement

        const selectedRes = selectElement.value;

        this.applyResolutionChangeToVideo(selectedRes)

        this.videoSelectedSource = selectedRes;

        return selectedRes;
    }
    videoPlayBackSpeed(videoElement : HTMLVideoElement , event : Event)
    {
      const selectElement = event.target as HTMLSelectElement;

      videoElement.playbackRate = Number.parseFloat(selectElement.value);
    }


    private applyResolutionChangeToVideo(selectedRes : string)
    {
      const video = this.videoElement.nativeElement as HTMLVideoElement;

      const videoTime = video.currentTime;

      const videoPaused = video.paused;

      video.src = this.selectedVideo!.videoRenditions[selectedRes];

      video.currentTime = videoTime;

      if(!videoPaused)
      {
        video.play();
      }

    }

    videoLoadMetaData(videoElement : HTMLVideoElement)
    {
        // if(this.loadVideoMetaDataOnce)
        // {
            const selectSpeedElement = this.selectPlayBackSpeed.nativeElement as HTMLSelectElement;
            const selectQualityVideo = this.videoQualitySettings.nativeElement  as HTMLSelectElement;
            selectSpeedElement.value = '1';
            videoElement.playbackRate = 1

        //theres a chance that select quality is still not rendered on the screen to set a default value

            const firstKey = Object.keys(this.selectedVideo!.videoRenditions)[0];
            selectQualityVideo.value = firstKey;

            this.videoSelectedSource = firstKey
            console.log(`Whats inside this trash variable videoSelectedSource ${this.videoSelectedSource}`);




            //  const selectSpeedElement = this.selectPlayBackSpeed.nativeElement as HTMLSelectElement;
            console.log(`Is the video loaeded right now!!!!!!!!!!!!! ${videoElement}`)
            console.log("🎥 Video Debug Info:");
            console.log(`video.readyState = ${videoElement.readyState}`); // 0 to 4
            console.log(`video.networkState = ${videoElement.networkState}`); // 0 to 3
            console.log(`video.duration = ${videoElement.duration}`); // should be > 0 when ready
            console.log(`video.currentSrc = ${videoElement.currentSrc}`);
            console.log(`video.paused = ${videoElement.paused}`);
            console.log(`video.ended = ${videoElement.ended}`);
            console.log(videoElement);

          videoElement.play();//Broswer gives an error warning but the functions works
          this.loadVideoMetaDataOnce = false;
        // }



    }

    hoverBarTimeTracker(mouseEvent : MouseEvent , inputBar : HTMLInputElement,)
    {
      const rect = inputBar.getBoundingClientRect();
      console.log(`Observe whats inside a getBoundingClinetRect${rect}`);

      console.log(`compare rect width ${rect.width} to rect.right ${rect.right}`);

      const x = mouseEvent.clientX - rect.left;
      const percentage =   x*100 / rect.width//use rect.width here instead of rect.right

      const hovoredTime = percentage *  Number.parseFloat(inputBar.max) / 100;

      console.log(`Currently at ${hovoredTime} suppose its %${percentage}`);

      this.hovoredPosition = x;
      this.hovoredTime = hovoredTime;



        const flooredHovoredTime = Math.floor(hovoredTime);
        const spriteIndex = Math.floor(flooredHovoredTime / DataCosntans.videoSpriteCapacity);

        if (spriteIndex !== this.selectedVideo?.spriteSheetIndex)
        {
          this.selectedVideo!.spriteSheetIndex = spriteIndex;
          this.selectedVideo!.spriteSheet =
            `${this.selectedVideo!.spriteSheetBasePath}/spriteSheet${spriteIndex}.jpg`;

          console.log(this.selectedVideo!.spriteSheet);
        }

        const frameOffsetInSprite = flooredHovoredTime % DataCosntans.videoSpriteCapacity;
        const col = frameOffsetInSprite % DataCosntans.videoSpriteCol;
        const row = Math.floor(frameOffsetInSprite / DataCosntans.videoSpriteCol);

        this.frameXPosition = -col * DataCosntans.frameWidth;
        this.frameYPosition = -row * DataCosntans.frameHeight;



    }



    hoverBarFrameTracker(inputBar: HTMLInputElement ,  videLengthBar: HTMLElement)
    {

      const rect = inputBar.getBoundingClientRect();
      const rectVideLengthBar = videLengthBar.getBoundingClientRect();


      const widthOfImageFrame = 160;
      const halfed = widthOfImageFrame/2;

      const gapBetweenLengthBarAndInputBar = rect.left - rectVideLengthBar.left;


      if(this.hovoredPosition !== null)
      {
        if(this.hovoredPosition <= halfed + gapBetweenLengthBarAndInputBar)
        {
          this.hovoredPositionForFrame = halfed + gapBetweenLengthBarAndInputBar;
        }
        else if(this.hovoredPosition + halfed >= rect.width)
        {
           this.hovoredPositionForFrame = rectVideLengthBar.right - (rectVideLengthBar.right - rect.width) - halfed;
        }
        else
        {
          this.hovoredPositionForFrame = this.hovoredPosition;
        }

      }


    }













    timeUpdate(videoElement : HTMLVideoElement)
    {
        this.videoPlayBackTime = videoElement.currentTime;
    }

    trackValues(inputBar: HTMLInputElement)
    {
      console.log(`Input bar value ${inputBar.value}`)
    }

    changeVideoTime(inputBar : HTMLInputElement , videoElement : HTMLVideoElement)
    {
      videoElement.currentTime = parseFloat(inputBar.value);
    }

    playPauseVideo(videoElement : HTMLVideoElement)
    {

      clearTimeout(this.ClearIconAtCenterTimeOut);
      if(videoElement.paused)
      {
        videoElement.play();
        this.videoIconAtCenterCurrent = this.playButtonIcon;

      }
      else
      {
        videoElement.pause();
        this.videoIconAtCenterCurrent = this.pauseButtonIcon;
      }
      this.clearIconAtCenterTimeOutFunc();
      this.hoverButtonTextUpdate();
    }


    changeScreenSize(fullScreenWrapper : HTMLDivElement)
    {
        if(!document.fullscreenElement)
        {
            fullScreenWrapper.requestFullscreen();
            this.videoFullScreen = true;
        }
        else
        {
          document.exitFullscreen();
          this.videoFullScreen = false;
        }

        console.log(`current status of videoFullScreen ${this.videoFullScreen}`);



        this.hoverButtonTextUpdate();
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
                this.titleService.setTitle(result.title);
                this.selectedVideo = result;


                for (const resolution in result.videoRenditions) {
                  if (result.videoRenditions.hasOwnProperty(resolution)) {
                    console.log(`Resolution: ${resolution}, URL: ${result.videoRenditions[resolution]}`);
                  }
                }

                console.log(JSON.stringify(this.selectedVideo));
                this.commentsCountSubject.next(this.selectedVideo.totalCommentReplyCount);

                this.getUserFollowersForThisPage();
                this.requestCategoryStats(selectedVideoId);
            }



        })
   }




  sanitizeAndFormatDescription(text?: string): CommentSegment[][] | null
  {
    if(text == undefined)
    {
      return null;
    }
  const regex = /(https?:\/\/[^\s]+)|(?<!\d)(\d{1,2}:\d{2}(?::\d{2})?)(?!\d)/;

  // Split by lines first
  const lines = text.split('\n');

  return lines.map(line =>
    {
    const words = line.split(/\s+/); // word-based for this line

    return words.map(word => {
      if (regex.test(word))
      {
        if (word.startsWith('http'))
        {
          return { type: 'link', value: word };
        }
        else
        {
          return { type: 'timestamp', value: word };
        }
      }
      else
      {
        return { type: 'text', value: word };
      }
    });
  });
}



  splitMore(line : string)
  {
    return line.split(' ');
  }



  formatTimeStampToTotalSeconds(timeSpanText : string) : number | undefined
  {
    const timeStamp = timeSpanText;
    console.log('is FormatTimeStampToTotalSeocnds wokring')
    const numbers : string[] = timeStamp.split(':');

    let timeStampTimeInSeconds = 0 ;

    if(numbers.length === 3)//01:20:57 || 1:20:57
    {
      const hoursToSeconds = Number.parseInt(numbers[0]) * 3600;
      const minutesToHours = Number.parseInt(numbers[1]) * 60;
      const seconds =  Number.parseInt(numbers[2]);
      timeStampTimeInSeconds += (hoursToSeconds + minutesToHours + seconds);
    }

    if(numbers.length == 2)//20:57 || 0:52
    {
      const minutesToHours = Number.parseInt(numbers[0]) * 60
      const seconds =  Number.parseInt(numbers[1]);
       timeStampTimeInSeconds += (minutesToHours + seconds);
    }

    const res = this.isTheTimeStampTimeValidForVideo(timeStampTimeInSeconds)

    if(res)
      return timeStampTimeInSeconds;
    else
      return undefined;

  }

  private isTheTimeStampTimeValidForVideo(timeStampTimeInSeconds : number)
  {
    const videoElement = this.videoElement.nativeElement;

    if(videoElement.duration >= timeStampTimeInSeconds)
      return true;


    else
      return false;
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




   private async getUserFollowersForThisPage()
   {

       const ProfilesFollowingasyncResult = await firstValueFrom(this.userFollowing$.pipe(take(1)));
       if(ProfilesFollowingasyncResult === null)
       {
          console.log("getUserFollowersForThisPage is not working correctly, the observable userFOllowing$ returned a null, NOTE User is likely not logged in ");
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

        setInterval(() =>
        {
            console.log(`!!!!!!!!!Has clicked comment form changed ${this.isUserClickingCommentForm}`);
        },  1000)
    }

    cancelUserComment()
    {
      this.commentForm.reset();
      this.isUserClickingCommentForm = false;
    }


    addComment()
    {
        if(this.commentForm.invalid && this.userName === null)
        {
            console.error("Invalid commonet form ");
            return;
        }

          let addCommentDTO: AddCommentDTO =
          {
            userName: '',  // default empty string
            description: '',   // default empty string
            videoRecordId: 0,
            // initialize other properties as needed

          };
          addCommentDTO.userName = this.userName as string ;

          addCommentDTO.description = this.commentForm.value.Comment;
          addCommentDTO.videoRecordId = this.selectedVideoId;


            this.commentService.addComment(addCommentDTO);

            this.commentForm.reset();
    }

    addCommentReaction(commentId : number, reaction : boolean, individualComment?: HTMLElement)
    {
      this.selectedComment = commentId;

      if(this.userName === null)
        {

          return;
        }

      this.userCommentReactions = this.reactionService.userCommentReactions;
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
        this.reactionService.addUpdateUserCommentReaction(commentId, reaction)
        .subscribe(result => {
        this.reactionService.userCommentReactions[commentId] = result.like;
        this.userCommentReactions = this.reactionService.userCommentReactions;
        this.updateCommentReactionsCounts(commentId, result.likeCount, result.dislikeCount);
    });
    }
    private deleteCommentReaction(commentId : number)
    {
        this.reactionService.deleteUserCommentReaction(commentId)
        .subscribe(result => {
        delete this.reactionService.userCommentReactions[commentId];
        this.userCommentReactions = this.reactionService.userCommentReactions;
        this.updateCommentReactionsCounts(commentId, result.likeCount, result.dislikeCount);
    });
    }
    private updateCommentReaction(commentId: number, reaction: boolean)
    {
        this.reactionService.addUpdateUserCommentReaction(commentId, reaction)
      .subscribe(result => {
      this.reactionService.userCommentReactions[commentId] = result.like;
      this.userCommentReactions = this.reactionService.userCommentReactions;

      this.updateCommentReactionsCounts(commentId, result.likeCount, result.dislikeCount);
      });
    }

    private updateCommentReactionsCounts(commentId: number, likeCount: number, dislikeCount: number)
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
      let comment : VideoComment | undefined;

      this.videoComments$$
      .pipe(
        first(),
        map(found => found.find(c => c.id === commentId))

      ).subscribe(
        {
          next : (found) =>
          comment = found
        }
      )

      return comment;
    }

    loadComments()//THIS WOULD BE SO MUCH BETTER IF I REWRITE IT
    {
        if(this.selectedVideo && !this.checkIfAllCommentsWereLoadedAlready(this.commentService.countOfCurrentlyPulledComments(), this.selectedVideo!.commentCount))
        {
              this.autoLoadComments = true;
              this.commentService.getVideoComments(this.selectedVideoId,);




              this.GetUserReactions();//possibly has to be async and executed after commentService is done
          }

         this.ThisCreatesAnEventListinerForTHeTimeStamps();//slight delay giving the dom time to render the comment container NOTE THIS needs to be heavily re written probably into request animation frame


    }

  private ThisCreatesAnEventListinerForTHeTimeStamps()
  {
    setTimeout(() =>
    {
      const commentContainer = this.commentContainer.nativeElement;

      console.log(`DID THIS MORON LOAD`);

      if (commentContainer)
      {
        console.log(`Check if the comment element is actually rendered ${commentContainer}`);

        commentContainer.addEventListener('click', (event) =>
        {
          const target = event.target;
          if (target instanceof HTMLElement)
          {
            console.log(`target instance of ${target}`);
            console.log(target.getAttribute('data-class'));
            console.log(`call this once`);
            if (target.classList.contains('timestamp'))
            {
              if (target.textContent)
              {

                const forwardVideoToTime = this.formatTimeStampToTotalSeconds(target.textContent);

                if (forwardVideoToTime)
                {
                  this.videoElement.nativeElement.scrollIntoView({ behavior: 'instant', block: 'start' });
                  this.videoElement.nativeElement.currentTime = forwardVideoToTime;
                }

              }
            }
          }
        });
      }
    }, 50);
  }

  private GetUserReactions()
  {
    var userId: string | null = null;
    this.userNameAsObservable.subscribe((data) =>
    {
      userId = data;

      if (userId !== null)
      {
        this.reactionService.getUserCommentLikesDislikes(this.selectedVideoId)
          .subscribe(
            {
              next: (data) =>
              {
                for (var commentReaction of data)
                {

                  this.reactionService.userCommentReactions[commentReaction.commentId] = commentReaction.like;
                  this.userCommentReactions = this.reactionService.userCommentReactions;
                }

              },

              error: (error) =>
              {
                console.error(`Error while getting the userCommentReactions`, error);
              }
            }
          );
      }
    });
  }

    checkIfAllCommentsWereLoadedAlready(currentCommentCollectionCount: number , totalFoundInVideo : number)
    {
        return currentCommentCollectionCount == totalFoundInVideo;
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

    getRepliesForCommnet(commentId : number, comment : VideoComment, initial? : boolean)
    {
      if(this.expandRepliesComments[commentId] && initial)
      {
        this.expandRepliesComments[commentId] = false;
        return;
      }

          const repliesUnderComment = this.commentService.commentRepliesSubject[commentId]?.getValue() ?? undefined;
          if(initial && repliesUnderComment === undefined)
          {
              this.paginateReplyUnderComments(commentId);
          }

          else if(!initial && (comment.repliesCount > repliesUnderComment.length))
          {
              this.paginateReplyUnderComments(commentId);
          }

          console.log(`Comment reply max cap ${comment.repliesCount} vs how much we got now replies loaded count ${this.commentService.commentRepliesSubject[commentId]?.getValue()}`)

      this.expandRepliesComments[commentId] = true;

      if(this.userName !== null)
      {
        this.reactionService.getUserRepliesReactions(commentId)
        .subscribe(
        {
          next : (data) =>
          {
            for(var replyReaction of data)
            {
                this.reactionService.userReplyReactions[replyReaction.replyId] = replyReaction.like;
                this.userReplyReactions = this.reactionService.userReplyReactions;
            }

          }
        }
      )
      }



    }
    async paginateReplyUnderComments(commentId : number)
    {
        const skip = this.skipTrackerForReplies[commentId] ?? 0;

        await this.commentService.getCommentReplies(this.selectedVideoId, commentId , skip);

        this.commentReplies$[commentId] = this.commentService.commentRepliesSubject[commentId].asObservable();
        if(this.commentService.didWeTookRepliesCorrecty)//this check here is a big if didWeTookRepliesCorrecty gets updated only in subscibe next or error
        {
          this.skipTrackerForReplies[commentId] = (this.skipTrackerForReplies[commentId] ?? 0) + 20;
        }


    }

     collapseReplyThread(comment : number, individualComment: HTMLElement)
    {
        this.expandRepliesComments[comment] = false;

        individualComment.scrollIntoView({ behavior: 'smooth', block : 'center', inline : 'nearest'})
    }

    addReplyReaction(commentId : number, replyId : number , reaction : boolean)
    {
        this.selectedReply = replyId;
        if(this.userName === null) return;

        if(!this.reactionService.userReplyReactions.hasOwnProperty(replyId))//Make a reaction
        {
            this.createReplyReaction(commentId, replyId , reaction);
        }
        else if(this.reactionService.userReplyReactions[replyId] === reaction)//delete/neutral reaction
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
        this.reactionService.addUpdateReplyReaction(replyId, reaction)
        .subscribe(
          {
            next : (data) =>
            {
              this.reactionService.userReplyReactions[replyId] = reaction
              this.userReplyReactions = this.reactionService.userReplyReactions

              this.updateReplyLikeDislikeCounts(commentId ,replyId ,data)
            }
          })
    }

    private deleteReplyReaction(commentId : number, replyId : number )
    {
        this.reactionService.deleteUserReplyReaction(replyId)
        .subscribe(
          {
            next : (data) =>
            {
              delete this.reactionService.userReplyReactions[replyId];
              this.userReplyReactions = this.reactionService.userReplyReactions

              this.updateReplyLikeDislikeCounts(commentId ,replyId ,data)
            }
          }
        )
    }

    private updateReplyReaction(commentId : number, replyId : number , reaction : boolean)
    {
        this.reactionService.addUpdateReplyReaction(replyId, reaction)
        .subscribe(
          {
            next : (replyLikeDislikeCountUpdateDTO) =>
            {
              this.reactionService.userReplyReactions[replyId] = reaction
              this.userReplyReactions = this.reactionService.userReplyReactions

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



            this.commentService.addReplyToComment(reply).subscribe(
            {
                next : (newReply) =>
                {
                  console.log(`User ${newReply.userName} replied : ${newReply.description} to comment with id ${newReply.commentId} in video with id ${newReply.videoRecordId}`);

                  newReply.uploaded = new Date(newReply.uploaded);

                  this.commentService.updateCommentRepliesSubject(commentId, newReply);
                  this.increaseClientSideCommentReplyCount(commentId);
                  this.videoService.locallyUpdateCommentCountAfterUserReply();//probably delete

                  this.commentsCountSubject.next(this.commentsCountSubject.value + 1);


                  this.cancelReplyForm(commentId , replyId);
                }
            });


          }



        }
    }

    increaseClientSideCommentReplyCount(commentId : number| undefined)
  {
    let comments : VideoComment[] = [];
    this.videoComments$$.pipe(take(1)).subscribe(
      {
        next : (theComments) =>
          {
            comments = theComments
          }
      }
     );

    const upDatedComments = comments.map(comment =>
      comment.id === commentId ? {...comment, repliesCount : comment.repliesCount + 1} : comment
    );



    this.commentService.updateVideoCommentsSubjectBehavior(upDatedComments);
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

    private loadUserVideoReaction()
    {


      this.reactionService.GetCurrentUserVideoReaction(this.selectedVideoId)
      .subscribe(data =>
      {
          this.userVideoReaction = data;

      }
      )
    }



    private loadLikeDislikeCount() : Promise<void>
    {
      const videoIdFromUrl = parseInt(this.activatedRoute.snapshot.paramMap.get('id') ?? '-1');

      const res = this.videoService.getVideoLikesDislikeCount(videoIdFromUrl)


      return new Promise<void>((resolve, reject)=>
      {
          console.log("were inside the promise of loadLikeDislikeCount");
          res.subscribe(
        {
          next : (data) =>
          {
            this.likeDislikeCounter = data;

            console.log(this.likeDislikeCounter);
            console.log(`Like ${this.likeDislikeCounter.likes}`);
            console.log(`Dislike ${this.likeDislikeCounter.dislikes}`);
          },
          error : (err) =>
          {
            console.error("I think loading getVideoLikesDislikeCount API gave an error ",err)
            reject(err);
          },
          complete : ()=> console.log("loadLikeDislike finished")
        })

        resolve();
      })




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


        this.commentService.sortComments(this.selectedVideoId, criteria);

    }





    commentRevealDateMouseHover(mouseEntered : boolean, commentId : number)
    {
      if(mouseEntered)
      {
        this.commentRevealDate = true;
        this.commentToRevealId = commentId;
      }
      else
      {
        this.commentRevealDate = false;
        this.commentToRevealId = 0;
      }
    }

    replyRevealDateMouseHover(mouseEntered : boolean, replyId : number)
    {
      if(mouseEntered)
      {
        this.replyRevealDate = true;
        this.replyToRevealId = replyId;
      }
      else
      {
        this.replyRevealDate = false;
        this.replyToRevealId = 0;
      }
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

    async addVideoReaction(reactionClicked : string)
    {
        var currentUser : string | null = null;
        currentUser = await firstValueFrom(this.userNameAsObservable)



        if(currentUser === null)
        {
            return;
        }

        if(this.userVideoReaction)
        this.reactionService.updateUserVideoReaction(this.selectedVideoId , this.userVideoReaction, reactionClicked)
        .subscribe(
                {
                  next : (data) =>
                  {

                      this.reactionService.clientSideLikeDisklikeIncrementation(this.userVideoReaction!, reactionClicked, this.likeDislikeCounter!);
                      this.userVideoReaction = data;


                  }
                  ,
                  error : (err) =>
                  {
                    console.error("Error while deleting", err)
                  }

                }
              )


        }



        public subscribeToUser()//needs to change don t know how
        {
          const subscribingTo = this.selectedVideo?.videoOwnerId;
          const theCurrentUserId = this.authService.getUserIdFromToken();
          const userName = this.authService.getUserNameFromToken();
          const videoOwner = this.selectedVideo?.videoOwnerName;


          if(userName === null)
          {
            this.unRegisteredUserWantsToSubscribe = true;
            return;
          }

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

              this.subscriptionService.subscribeUserToVideoOwner(theCurrentUserId , userName, subscribingTo, videoOwner)
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
                this.subscriptionService.unSubscribeUserToVideoOwner(theCurrentUserId , userName, subscribingTo, videoOwner)
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

          formatNum(views? : number)
          {

            return this.formattingService.formatNum(views);
          }

          formatDateTimeReWrite(date : Date) : string
          {

            return this.formattingService.formatDateTimeReWrite(date);

          }

        }
























































