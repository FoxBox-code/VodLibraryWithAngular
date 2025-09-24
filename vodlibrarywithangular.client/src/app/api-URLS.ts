export class ApiUrls
{
    static readonly BASE = 'https://localhost:7156/api';

    //commentController
    static readonly COMMENT_CONTROLLLER = `${this.BASE}/comment`;

    //authService
    static readonly LOGIN = `${this.BASE}/auth/login`;
    static readonly REGISTER = `${this.BASE}/auth/register`;
    static readonly AUTH = `${this.BASE}/auth`;

    //videoService
    static readonly VIDEO = `${this.BASE}/video`
    static readonly CATEGORIES = `${this.BASE}/video/categories`;
    static readonly UPLOAD = `${this.BASE}/video/upload`;
    static readonly VIDEOSSECTIONS = `${this.BASE}/video/sections`;
    static readonly SELECTEDVIDEO = `${this.BASE}/video/play`;
    static readonly LIKEDVIDEOS = `${this.BASE}/video/liked`


    //commentService
    static readonly ADDCOMMENT = `${this.COMMENT_CONTROLLLER}/addComment`;
    static readonly ADDCOMMENT5000 = `${this.COMMENT_CONTROLLLER}/addComment5000`;
    static readonly ADDREPLY = `${this.COMMENT_CONTROLLLER}/addReply`;
    static readonly ADDREPLY5000 = `${this.COMMENT_CONTROLLLER}/addReply5000`;


    //WatchHistory API calls located at authService
    static readonly HISTORY = `${this.VIDEO}/history` //This should replace all the other garbage history API calls
    static readonly ADDVODTOHISTORY = `${this.VIDEO}/history`
    static readonly GETUSERHISTORYFORTODAY = `${this.VIDEO}/history`//Same as ADDVIDTOHISTORY but i did not want to cause confusion
    static readonly GETUSERHISTORYPASTTODAY = `${this.VIDEO}/past/history`
    static readonly DELETEUSERWATCHHISTORYALL = `${this.VIDEO}/past/history`

  }

