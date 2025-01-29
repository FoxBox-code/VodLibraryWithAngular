import { Component } from '@angular/core';
import { CategoryWithVideos } from '../models/category-with-videos';
import { VideoService } from '../video.service';

@Component({
  selector: 'app-videos-section',
  standalone: false,

  templateUrl: './videos-section.component.html',
  styleUrl: './videos-section.component.css'
})
export class VideosSectionComponent
{
  categoryWithVideos : CategoryWithVideos[] = [];
  constructor(private videoService : VideoService)
  {
      this.videoService.getVideosSection().subscribe(
      {
          next : (result) =>
          {
            this.categoryWithVideos = result
          },
          error : (error) => console.error(`Failed to retrive categories and it's videos ${error.message, error.status, error.error}`),
          complete : () =>
          {
              console.log(`Current value of categoryWithVideos${JSON.stringify(this.categoryWithVideos)}`);

          }

      });
  }
}
