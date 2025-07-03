export class ApiUrls
{
    static readonly BASE = 'https://localhost:7156/api';

    //authService
    static readonly LOGIN = `${this.BASE}/auth/login`;
    static readonly REGISTER = `${this.BASE}/auth/register`;

    //videoService
    static readonly CATEGORIES = `${this.BASE}/video/categories`;
    static readonly UPLOAD = `${this.BASE}/video/upload`;
    static readonly VIDEOSSECTIONS = `${this.BASE}/video/sections`;
    static readonly SELECTEDVIDEO = `${this.BASE}/video/play`;
    static readonly ADDCOMMENT = `${this.BASE}/video/addComment`;
    static readonly ADDREPLY = `${this.BASE}/video/addReply`;
    
  }

