import { Component, EventEmitter, Input, Output } from '@angular/core';
import { VideoWindow } from '../models/video-window';
import { VideoService } from '../services/video.service';
import { ChangeDetectionStrategy } from '@angular/core';
import { HistoryService } from '../services/history.service';

@Component({
  selector: 'app-playlist',
  standalone: false,
  changeDetection : ChangeDetectionStrategy.OnPush,

  templateUrl: './playlist.component.html',
  styleUrl: './playlist.component.css'
})
export class PlaylistComponent
{
  @Input() playList : VideoWindow[] | null = null;
  @Output() elementRemoved = new EventEmitter<VideoWindow[]>()
  constructor(private videoService : VideoService, private history: HistoryService)
  {

  }


  deleteLikedVideoFromHistroy(videoId : number)
    {
        this.history.deleteLikedVideoFromHistory(videoId)
        .subscribe(
          {
            next : (data) =>
            {
              console.log(data.message);


                if(this.playList)
                this.elementRemoved.emit(this.playList.filter(x => x.id !== videoId));
            },
            error : (err) =>
            {
              console.error(err.message);
            }
          }
        );
    }

    trackByVideoId(intde : number, video : VideoWindow)
    {
      return video.id;
    }
}
