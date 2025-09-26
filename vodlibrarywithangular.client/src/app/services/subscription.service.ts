import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiUrls } from '../api-URLS';
import { AuthService } from './auth.service';
import { SubscribingDTO } from '../models/subscribingDTO';
import { Observable } from 'rxjs';
import { VideoWindow } from '../models/video-window';
import { ProfilesFollowingDTO } from '../models/profiles-followingDTO';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {

  constructor(private httpClient : HttpClient, private authService : AuthService) { }


  subscribeUserToVideoOwner(userId : string, followerUserNameProp : string , videoOwnerId : string , subscribedToUserNameProp : string)
  {
    const headers = this.authService.getHttpHeaders();

    const subscribingDTO : SubscribingDTO =
    {
        followerId : userId,
        followerUserName : followerUserNameProp,
        subscribedToId : videoOwnerId,
        subscribedToUserName : subscribedToUserNameProp

    }

    return this.httpClient.post(`${ApiUrls.SUBSCRIBE_CONTROLLER}/subscribe`, subscribingDTO , {headers})
  }

  unSubscribeUserToVideoOwner(userId : string, followerUserNameProp : string , videoOwnerId : string , subscribedToUserNameProp : string)
  {
      const headers = this.authService.getHttpHeaders();



    const params : HttpParams = new HttpParams()
    .set('followerId', userId)
    .set('followerUserName', followerUserNameProp)
    .set('subscribedToId', videoOwnerId)
    .set('subscribedToUserName', subscribedToUserNameProp);


    console.log(params);
    return this.httpClient.delete(`${ApiUrls.SUBSCRIBE_CONTROLLER}/subscribe`, {headers,params});
  }

  getUserVideosFromSubscribers() : Observable<VideoWindow[]>
  {
    const headers = this.authService.getHttpHeaders();

    return this.httpClient.get<VideoWindow[]>(`${ApiUrls.SUBSCRIBE_CONTROLLER}/subscriptions`, {headers});
  }

  getUserFollowing() : Observable<ProfilesFollowingDTO[]>
    {
      const headers = this.authService.getHttpHeaders();

      return this.httpClient.get<ProfilesFollowingDTO[]>(`${ApiUrls.SUBSCRIBE_CONTROLLER}/subscribers`, {headers})


    }
}
