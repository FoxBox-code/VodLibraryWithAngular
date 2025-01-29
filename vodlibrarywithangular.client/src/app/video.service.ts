import { Injectable,inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Category } from './models/category';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ApiUrls } from './api-URLS';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { CategoryWithVideos } from './models/category-with-videos';

@Injectable({
  providedIn: 'root'
})
export class VideoService
{
  constructor(private httpClient : HttpClient, private authService : AuthService)
  {

  }

  getCategorys() : Observable <Category[]>
  {
    return this.httpClient.get<Category[]>(`${ApiUrls.CATEGORIES}`).
    pipe(catchError((error)=>
      {
        console.error(
        {
            message : error.message,
            status : error.status,
            error : error.error
        });

        return throwError(()=>
        {
              new Error("Failed to deliver Categories from the server!");
        });

      }));


  }

  uploadVideo(formData : FormData) : Observable<any>
  {
    const token = this.authService.getLocalStorageToken();
    console.log(`Current token : ${token}`);

    const headers = new HttpHeaders(
    {
      Authorization : `Bearer ${token}`
    });
    console.log(`Header loggin ${headers.get('Authorization')}`);


      return this.httpClient.post<any>(`${ApiUrls.UPLOAD}`, formData, {headers});
  }

  getVideosSection() : Observable<CategoryWithVideos[]>
  {
      return this.httpClient.get<CategoryWithVideos[]>(`${ApiUrls.VIDEOSSECTIONS}`)
      .pipe(catchError((error) =>
      {
          console.error('Failed back end response',
          {
              message: error.message,
              status : error.status,
              error : error.error
          });
          return throwError(()=> new Error('Could not provide video catalog'))

      }))

  }

}



