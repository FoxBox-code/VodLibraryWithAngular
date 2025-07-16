import { Component } from '@angular/core';
import { ActivatedRoute, Router} from '@angular/router';
import { VideoService } from '../video.service';
import { VideoWindow } from '../models/video-window';

@Component({
  selector: 'app-user-profile',
  standalone: false,

  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css'
})
export class UserProfileComponent
{
  userVideoCatalog : VideoWindow[] = [];
  constructor(private route : ActivatedRoute, private videoService : VideoService, private router : Router)
  {

  }

  ngOnInit()
  {
    this.route.paramMap.subscribe(
      {
        next : (data) =>
        {
            const urlUserId = data.get('userId');
            this.videoService.getUserVideosCatalog(urlUserId)
            .subscribe(
              {
                next : (data) =>
                {
                  data = data.map(x => (
                    {
                      ...x,
                      uploaded : new Date(x.uploaded)
                    }
                  )
                )

                  this.userVideoCatalog = data;
                },

                error : (err) =>
                {
                    if(err.status === 404)
                    {
                      this.router.navigate(['/not-found']);//Implement this page later
                    }
                }
              }
            )

        },

      }
    )


  }

  orderByNew()
  {
    if(this.userVideoCatalog.length > 0)
    {
      this.userVideoCatalog.sort((a,b) => b.uploaded.getTime() - a.uploaded.getTime());
    }
  }

  orderByOld()
  {
    if(this.userVideoCatalog.length > 0)
    {
      this.userVideoCatalog.sort((a,b) => a.uploaded.getTime() - b.uploaded.getTime());
    }
  }

}
