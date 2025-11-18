export class ApiUrls
{
    static readonly BASE = 'https://localhost:7156/api';

    //Controllers
    static readonly VIDEO_CONTROLLER = `${this.BASE}/video`;
    static readonly COMMENT_CONTROLLLER = `${this.BASE}/comment`;
    static readonly REACTION_CONTROLLER = `${this.BASE}/reaction`;
    static readonly HISTORY_CONTROLLER = `${this.BASE}/history`;
    static readonly SUBSCRIBE_CONTROLLER = `${this.BASE}/subscribe`;
    static readonly UPLOAD_CONTROLLER = `${this.BASE}/upload`;
    static readonly EDIT_CONTROLLER = `${this.BASE}/edit`

    //authService
    static readonly LOGIN = `${this.BASE}/auth/login`;
    static readonly REGISTER = `${this.BASE}/auth/register`;
    static readonly AUTH = `${this.BASE}/auth`;

    //videoService
    static readonly CATEGORIES = `${this.VIDEO_CONTROLLER}/categories`;
    static readonly UPLOAD = `${this.VIDEO_CONTROLLER}/upload`;
    static readonly VIDEOSSECTIONS = `${this.VIDEO_CONTROLLER}/sections`;
    static readonly PLAY = `${this.VIDEO_CONTROLLER}/play`;



    //commentService
    static readonly ADDCOMMENT = `${this.COMMENT_CONTROLLLER}/addComment`;
    static readonly ADDCOMMENT5000 = `${this.COMMENT_CONTROLLLER}/addComment5000`;
    static readonly ADDREPLY = `${this.COMMENT_CONTROLLLER}/addReply`;
    static readonly ADDREPLY5000 = `${this.COMMENT_CONTROLLLER}/addReply5000`;


    //historyService
    static readonly LIKEDVIDEOS = `${this.HISTORY_CONTROLLER}/liked`;
    static readonly GETUSERHISTORYFORTODAY = `${this.HISTORY_CONTROLLER}/today`;//Same as ADDVIDTOHISTORY but i did not want to cause confusion
    static readonly GETUSERHISTORYPASTTODAY = `${this.HISTORY_CONTROLLER}/past`;
    static readonly DELETEUSERWATCHHISTORYALL = `${this.HISTORY_CONTROLLER}/past`;
    static readonly DELETEINDIVIDUALVIDEORECORD = `${this.HISTORY_CONTROLLER}/invdividual`;





  }

