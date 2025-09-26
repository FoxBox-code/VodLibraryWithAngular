import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataCosntans } from '../dataconstants';
import { VideoWindow } from '../models/video-window';
import { VideoService } from '../services/video.service';

@Component({
  selector: 'app-genre-vidoes',
  standalone: false,

  templateUrl: './genre-vidoes.component.html',
  styleUrl: './genre-vidoes.component.scss'
})
export class GenreVidoesComponent
{
  genresKeyString = DataCosntans.supportedGenresStringToInt;
  genresKeyNumber = DataCosntans.supportedGenresIntToString;
  urlgenreOrId : string | null= '';
  categoryId : number | null = null;
  videos : VideoWindow[] = [];
  expandSort : boolean= false;
  constructor(private activeRouter : ActivatedRoute, private videoService : VideoService)
  {

  }

  ngOnInit()
  {

    this.activeRouter.paramMap.subscribe(
      {
        next : (data) =>
        {
          this.urlgenreOrId = data.get('genre');
          this.categoryId = this.convertUrlParamToId(this.urlgenreOrId);
          this.retrieveVideoCategories();
        }
      }
    )
  }

  private retrieveVideoCategories()
  {
      if(this.categoryId)
      this.videoService.getCategoryVideos(this.categoryId)
      .subscribe(
      {
        next : (res =>
          {
            this.videos = res;
          }
        )
        ,error : (err) =>
          {
            console.error(err);
          }
      }
    );
  }

  private convertUrlParamToId(param : string | null) : number | null
  {
      if(param === null)
      {
        console.error(`Invlaid params`);
        return null;
      }

      const paramToNumber = Number(param);

      if(!isNaN(paramToNumber) && this.genresKeyNumber.hasOwnProperty(paramToNumber))
      {
        return paramToNumber;
      }

      param = param.toLocaleLowerCase();
      if(this.genresKeyString.hasOwnProperty(param))
      {

        const genreFromDictionary = this.genresKeyString[param];

        return genreFromDictionary;
      }

      console.error(`Unable to convert the param into ganre id`)
      return null;
  }

  public sortOptions(event : EventTarget | null)
  {
    const element = event as HTMLSelectElement;
    const option = element.value;
    this.videos;
    if(option === 'recent')
    {
      this.videos = this.videos.sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime())
    }

    else if(option === 'top')
    {
      this.videos = this.videos.sort((a, b)=> b.views - a.views);
    }

  }
  public funcExpandSort()
  {
    this.expandSort = true;
  }














}
