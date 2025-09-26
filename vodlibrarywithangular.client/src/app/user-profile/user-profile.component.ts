import { Component } from '@angular/core';
import { ActivatedRoute, Router} from '@angular/router';
import { VideoService } from '../services/video.service';
import { VideoWindow } from '../models/video-window';

@Component({
  selector: 'app-user-profile',
  standalone: false,

  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent
{
  userVideoCatalog : VideoWindow[] = [];
  sessionSavingLoading : boolean = false;
  sortingMethodType : string = '';
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

                  const key = this.generateSessionKey();

                  const savedSort = sessionStorage.getItem(key);

                  if(savedSort !== null)
                  {
                    this.sessionSavingLoading = true;
                    this.orderSelector(savedSort);
                    this.sortingMethodType = savedSort;
                  }
                  else
                    this.sortingMethodType = 'newest';


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

  orderSelector(orderType : string)
  {
      if(orderType === 'newest')
      {
          this.orderByNew();
      }
      else if(orderType === 'oldest')
      {
          this.orderByOld();
      }
      else if(orderType === 'popular')
      {
          this.orderByPopular();
      }

      if(!this.sessionSavingLoading)//skip the going back to session saving if we load it
      {
        this.sessionSortOnThisPage(orderType);

      }
      this.sessionSavingLoading = false;
      this.sortingMethodType = orderType;


  }

  private orderByNew()
  {
    if(this.userVideoCatalog.length > 0)
    {
      this.userVideoCatalog.sort((a,b) => b.uploaded.getTime() - a.uploaded.getTime());
    }
  }

  private orderByOld()
  {
    if(this.userVideoCatalog.length > 0)
    {
      this.userVideoCatalog.sort((a,b) => a.uploaded.getTime() - b.uploaded.getTime());
    }
  }

  private orderByPopular()
  {
    if(this.userVideoCatalog.length > 0)
    {
      this.userVideoCatalog.sort((a,b)=> b.views - a.views);
    }

  }

  private sessionSortOnThisPage(orderType : string)
  {
      const key = this.generateSessionKey();

      sessionStorage.setItem(key, orderType);
  }

  private generateSessionKey() : string
  {
      const profileId = this.route.snapshot.paramMap.get('userId');
      const key = `{profilesort:${profileId}}`;

      return key;
  }

}
