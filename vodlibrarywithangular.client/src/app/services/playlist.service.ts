import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { ApiUrls } from '../api-URLS';
import { BehaviorSubject, Observable } from 'rxjs';
import { VideoWindow } from '../models/video-window';
import { PlayListMapper } from '../models/playListMaper';
import { Router } from '@angular/router';
import { VideoWindowMini } from '../models/videoWindowMini';
import { LinkedListNode, LinkList } from '../utility/linkedListImplementation';

@Injectable({
  providedIn: 'root'
})
export class PlaylistService
{

  constructor(private httpClient : HttpClient , private authService : AuthService, private router : Router)
  {

  }

  playList : VideoWindow[] = [];
  playListMini : VideoWindowMini[] = []
  playListMapper : PlayListMapper | null = null;
  selectedVideoId : number = -1;

  dictionaryPlayList = new Map<number , LinkedListNode<VideoWindowMini>>();

  private likePlayListSubject = new BehaviorSubject<VideoWindow[] | null>(null);
  likePlayList$ = this.likePlayListSubject.asObservable();

  public likePlayListMiniSubject = new BehaviorSubject<PlayListMapper | null>(null);
  likePlayListMini$ = this.likePlayListMiniSubject.asObservable();


  getUserLikedVideos() : Observable<VideoWindow[]>
  {
    const headers = this.authService.getHttpHeaders();

    return this.httpClient.get<VideoWindow[]>(`${ApiUrls.VIDEO_CONTROLLER}/likedVideosPlayList`, {headers})

  }


  async provideLikedPlayListAsObservable() : Promise<Observable<VideoWindow[] | null>>
  {
    if(this.likePlayListSubject.getValue() === null)
    {
      await this.getUserLikedVideos2();
    }

    return this.likePlayList$;
  }

  private convertVideoWindowToVidoeWindowMini(playList : VideoWindow[]) : VideoWindowMini[]
  {
    const playListMini = playList.map((x)=>

      {
        const mini : VideoWindowMini =
        {
          thumbnail : x.imagePath,
          title : x.title,
          videoOwnerName : x.videoOwnerName,
          videoOwnerId : x.videoOwnerId,
          videoId : x.id,
          hours : x.hours,
          minutes : x.minutes,
          seconds : x.seconds,
        }

        return mini;
      })

  return playListMini;

  }

  private getUserLikedVideos2() : Observable<VideoWindow[]>
  {
    const headers = this.authService.getHttpHeaders();

    return this.httpClient.get<VideoWindow[]>(`${ApiUrls.VIDEO_CONTROLLER}/likedVideosPlayList`, {headers})


  }


//load of bullshit
  getLikedListMini(): Observable<PlayListMapper | null> {
  // If already cached, return immediately
  if (this.likePlayListMiniSubject.getValue() !== null) {
    return this.likePlayListMini$;
  }

  // If the main playlist is not yet loaded, fetch it
  if (this.likePlayListSubject.getValue() === null) {
    this.getUserLikedVideos2()
      .subscribe({
        next: (data) => {
          this.likePlayListSubject.next(data);

          const playList = this.likePlayListSubject.getValue();
          if (playList === null) {
             console.error("yeah we fuckedUp User has no likePlaylist records we shouldn't be here at all ");
            return;
          }

          const playListMini = this.convertVideoWindowToVidoeWindowMini(playList);
          const playListMapper = this.buildPlayListMapper(playListMini);

          if (playListMapper !== null) {
            this.likePlayListMiniSubject.next(playListMapper);
          }
        },
        error: (err) => {
          console.error(err);
        }
      });
  } else {
    // If we already have the main playlist, we can build the mini version immediately
    const playList = this.likePlayListSubject.getValue();
    if (playList !== null) {
      const playListMini = this.convertVideoWindowToVidoeWindowMini(playList);
      const playListMapper = this.buildPlayListMapper(playListMini);

      if (playListMapper !== null) {
        this.likePlayListMiniSubject.next(playListMapper);
      }
    }
  }

  // ✅ Always return the observable, even if async part hasn’t completed yet
  return this.likePlayListMini$;
}


  public buildPlayListMapper(playListMini : VideoWindowMini[]) : PlayListMapper | null
  {
      const linkedList = new LinkList<VideoWindowMini>();
      linkedList.fromCollection(playListMini);
      const currentNode = linkedList.head;
      const selectedVideoId = linkedList.head?.value.videoId;

      if(currentNode && selectedVideoId)
      {
        const playListMapper : PlayListMapper =
        {
          selectedVideoId : selectedVideoId,
          playList : linkedList,
          currentNode : currentNode

        }
        return playListMapper
      }
      else
      {
        console.error("Inside buildPlayListMapper, in PlayListService linked list faild to build a header therefore the user does not have any liked videos for a playlist. No idea how we got here ");
        return null;
      }




  }

  navigateToPlayVideo(videoId : number)
    {
        this.router.navigate(['/playing', videoId], {queryParams : {showPlayList : true }});
    }

    public configurePlayList(videoId : number)
      {
          let splicedPlayList : VideoWindowMini[] = [];
          let proccessFailed : boolean = true;

              for (let index = 0; index < this.playListMini.length; index++)
              {
                if(this.playList[index].id === videoId)
                {
                  splicedPlayList = this.playListMini.slice(index);
                  const linkedList = new LinkList<VideoWindowMini>();
                  linkedList.fromCollection(splicedPlayList);
                  const playListMapper : PlayListMapper =
                  {
                    selectedVideoId : videoId,
                    playList : linkedList,
                    currentNode : linkedList.findNode(videoWindowMini => videoWindowMini.videoId === this.selectedVideoId) ?? linkedList.head
                  }

                  this.playListMapper = playListMapper;

                  proccessFailed = false;
                 break;
               }
             }
             if(proccessFailed)
               console.error("Function configurePlayList failed to adjust the list , videoId was likely not found in the list in the for loop")
            }



  deleteNodeFromPlayList(videoId : number)
  {
      const list = this.likePlayListMiniSubject.getValue();

      if(list)
      {
        list.playList.deleteNode(node => node.videoId === videoId)

        this.likePlayListMiniSubject.next(list);
      }
  }

}





