export class ApiUrls
{
    static readonly BASE = 'https://localhost:7156/api';

    //Controllers
    static readonly VIDEO_CONTROLLER = `${this.BASE}/video`;
    static readonly COMMENT_CONTROLLLER = `${this.BASE}/comment`;
    static readonly REACTION_CONTROLLER = `${this.BASE}/reaction`;

    //authService
    static readonly LOGIN = `${this.BASE}/auth/login`;
    static readonly REGISTER = `${this.BASE}/auth/register`;
    static readonly AUTH = `${this.BASE}/auth`;

    //videoService

    static readonly CATEGORIES = `${this.VIDEO_CONTROLLER}/categories`;
    static readonly UPLOAD = `${this.VIDEO_CONTROLLER}/upload`;
    static readonly VIDEOSSECTIONS = `${this.VIDEO_CONTROLLER}/sections`;
    static readonly LIKEDVIDEOS = `${this.VIDEO_CONTROLLER}/liked`;
    static readonly PLAY = `${this.VIDEO_CONTROLLER}/play`;


    //commentService
    static readonly ADDCOMMENT = `${this.COMMENT_CONTROLLLER}/addComment`;
    static readonly ADDCOMMENT5000 = `${this.COMMENT_CONTROLLLER}/addComment5000`;
    static readonly ADDREPLY = `${this.COMMENT_CONTROLLLER}/addReply`;
    static readonly ADDREPLY5000 = `${this.COMMENT_CONTROLLLER}/addReply5000`;


    //WatchHistory API calls located at authService
    static readonly HISTORY = `${this.VIDEO_CONTROLLER}/history` //This should replace all the other garbage history API calls
    static readonly ADDVODTOHISTORY = `${this.VIDEO_CONTROLLER}/history`
    static readonly GETUSERHISTORYFORTODAY = `${this.VIDEO_CONTROLLER}/history`//Same as ADDVIDTOHISTORY but i did not want to cause confusion
    static readonly GETUSERHISTORYPASTTODAY = `${this.VIDEO_CONTROLLER}/past/history`
    static readonly DELETEUSERWATCHHISTORYALL = `${this.VIDEO_CONTROLLER}/past/history`

  }

