import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { VideoWindow } from './models/video-window';
import { ApiUrls } from './api-URLS';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { FormGroup } from '@angular/forms';
import { EditVideoFormControls } from './models/EditVideoFormControls';

@Injectable({
  providedIn: 'root'
})
export class EditService {


  constructor(private authService : AuthService, private httpClient : HttpClient) { }


  getEditVideoInfo(videoId : number) : Observable<VideoWindow>
    {
        const headers = this.authService.getHttpHeaders();
        return this.httpClient.get<VideoWindow>(`${ApiUrls.VIDEO_CONTROLLER}/edit/${videoId}`, {headers});
    }

    patchEditVideo(videoId : number ,formGroup : FormGroup<EditVideoFormControls> , newImageFile : string | undefined) : Observable<VideoWindow>
      {
        const headers = this.authService.getHttpHeaders();

        const payload =
        {
          title : formGroup.value.Title ?? null,
          description : formGroup.value.Description ?? null,
          categoryId : formGroup.value.CategoryId ?? null,
          newImageString : newImageFile ?? null
        }
          console.log("Sending PATCH payload:", JSON.stringify(payload, null, 2));

        return this.httpClient.patch<VideoWindow>(`${ApiUrls.VIDEO_CONTROLLER}/edit/${videoId}`, payload ,{headers})
      }

      deleteVideo(videoId : number)
  {
    const headers = this.authService.getHttpHeaders();

    return this.httpClient.delete(`${ApiUrls.VIDEO_CONTROLLER}/delete/${videoId}`,{headers})
  }
}
