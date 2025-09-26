import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UploadServerMessageResponse } from '../models/uploadServerMessageResponse';
import { AuthService } from './auth.service';
import { ApiUrls } from '../api-URLS';

@Injectable({
  providedIn: 'root'
})
export class UploadVideoService
{

  constructor(private httpClient : HttpClient, private authService : AuthService)
  { }

  uploadVideoNew(formData : FormData) : Observable<UploadServerMessageResponse>
    {
      const token = this.authService.getLocalStorageToken();
      console.log(`Current token : ${token}`);

      const headers = this.authService.getHttpHeaders();
      console.log(`Header loggin ${headers.get('Authorization')}`);


      return this.httpClient.post<UploadServerMessageResponse>(`${ApiUrls.UPLOAD_CONTROLLER}/video`, formData, {headers});
    }

    getStatusForVideo(videoId : number) : Observable<any>
    {
      const params = {videoId : videoId}
      return this.httpClient.get<any>(`${ApiUrls.UPLOAD_CONTROLLER}/polling/videoStatus`, {params})
    }
}
