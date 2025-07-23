import { Component, Input } from '@angular/core';
import { VideoWindow } from '../models/video-window';

@Component({
  selector: 'app-video-window',
  standalone: false,

  templateUrl: './video-window.component.html',
  styleUrl: './video-window.component.scss'
})
export class VideoWindowComponent
{
  @Input() video : VideoWindow | undefined = undefined;

  constructor()
  {

  }
}

