import { Component, Input } from '@angular/core';
import { VideoWindow } from '../models/video-window';

@Component({
  selector: 'app-video-catalog',
  standalone: false,

  templateUrl: './video-catalog.component.html',
  styleUrl: './video-catalog.component.scss'
})
export class VideoCatalogComponent
{

  @Input()  videosCatalog : VideoWindow[] = [];

}
