import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PlaylistService } from '../playlist.service';
import { VideoWindowMini } from '../models/videoWindowMini';
import { VideoWindow } from '../models/video-window';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoService } from '../video.service';
import { PlayVideo } from '../models/play-video';
import { PlayListMapper } from '../models/playListMaper';
import { LinkList } from '../utility/linkedListImplementation';
import { Observable } from 'rxjs';
import { HistoryService } from '../history.service';

@Component({
  selector: 'app-playlistmini',
  standalone: false,

  templateUrl: './playlistmini.component.html',
  styleUrl: './playlistmini.component.css'
})
export class PlaylistminiComponent
{
  playList : VideoWindowMini[] = [];
  playList$! : Observable<PlayListMapper | null>
  playListMapper : PlayListMapper | null = null;

  @Input () userName : string | null = null;
  @Output() newVideoPlaying = new EventEmitter<PlayListMapper>

  selectedVideoID : number | null = null;



  constructor(private playListService : PlaylistService, private activatedRoute : ActivatedRoute, private router : Router, private videoService : VideoService, private historyService : HistoryService)
  {
    const value = sessionStorage.getItem('likePlayList');
    if(value)
    {
       let jsonParsed = (JSON.parse(value)) as VideoWindow[];

       console.log(jsonParsed);

       this.playList = jsonParsed.map((x) =>
      {
          const item : VideoWindowMini = {
            thumbnail : x.imagePath,
            title : x.title ,
            videoOwnerName : x.videoOwnerName ,
            videoOwnerId : x.videoOwnerId,
            videoId : x.id,
            hours : x.hours,
            minutes : x.minutes,
            seconds : x.seconds}
          return item
      })

      const playListWrapper = this.playListService.buildPlayListMapper(this.playList);

      this.playListService.likePlayListMiniSubject.next(playListWrapper)

       this.selectedVideoID = parseInt (activatedRoute.snapshot.paramMap.get('id') ?? '-1')
    }

    activatedRoute.params.subscribe(
      {
        next : (params) =>
        {
          const videoId = +params['id'];

          this.selectedVideoID = videoId;//this sets the highlighted video in the playlist

          // this.configurePlayList(videoId)



        }
      }
    )

  }

  ngOnInit()
  {
    this.playList$ = this.playListService.getLikedListMini();

    this.playList$.subscribe(data =>
      {
        this.playListMapper = data;

      })
  }



  videoLengthString(hours : number, minutes : number, seconds : number)
    {
      const sHours = hours === 0 ? '' : hours.toString() + ':';

      const sMinutes = hours === 0 && minutes === 0 ? '' : minutes.toString() + ':';

      const sSec = hours === 0 && minutes === 0 ? seconds + 'sec' : seconds< 10 ? '0' + seconds : seconds.toString();

      return `${sHours}${sMinutes}${sSec}`;
    }

    navigateToPlayVideo(videoId : number)
    {
        if(this.playListMapper)
        {
          this.playListMapper.currentNode = this.playListMapper?.playList.findNode(video => video.videoId === videoId)
        }

        this.router.navigate(['/playing', videoId], {queryParams : {showPlayList : true }});
    }

    removeFromList(videoId : number)
    {
      const urlVideoId = parseInt(this.activatedRoute.snapshot.paramMap.get('id') ?? '-1')

      if(urlVideoId !== videoId)
      {
          this.historyService.deleteLikedVideoFromHistory(videoId).subscribe(
        {
          next : () => console.log("Server removed like successfully")
        }
      );

      this.playListService.deleteNodeFromPlayList(videoId);
      }

    }




}
