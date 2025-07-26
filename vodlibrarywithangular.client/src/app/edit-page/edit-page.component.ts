import { Component } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { EditVideoDataDTO } from '../models/editVideoData';
import { VideoService } from '../video.service';
import { Observable } from 'rxjs';
import { VideoWindow } from '../models/video-window';
import { Category } from '../models/category';
import { ActivatedRoute } from '@angular/router';
@Component({
  selector: 'app-edit-page',
  standalone: false,

  templateUrl: './edit-page.component.html',
  styleUrl: './edit-page.component.scss'
})
export class EditPageComponent
{
    editVideoMetaDataForm : FormGroup
    videoToEdit : EditVideoDataDTO | undefined;
    selectedVideo$ : Observable<VideoWindow | null>;
    categories : Category[] = [];
    constructor(formBuilder : FormBuilder, videoService : VideoService, activatedRoute : ActivatedRoute)
    {


      this.selectedVideo$ = videoService.selectedVideo$;
      this.selectedVideo$.subscribe(
        {
          next : (res)=>
          {
            if (res === null)
            {
              const videoId = activatedRoute.snapshot.paramMap.get('videoId')

              if(videoId)
                videoService.getEditVideoInfo(videoId)
                            .subscribe
                            (
                              {
                                next : (data)=>
                                {
                                  res = data
                                }
                                ,error : (err) =>
                                {
                                  console.log(`${err.message}, ${err.JSON}`)
                                }
                              }

                            )

            }
          }
        }
      )
      this.editVideoMetaDataForm = formBuilder.group
      (
        {

        }
      )
    }

}
