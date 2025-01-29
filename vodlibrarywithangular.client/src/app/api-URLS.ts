export class ApiUrls
{
    static readonly BASE = 'https://localhost:7156/api';

    static readonly LOGIN = `${this.BASE}/auth/login`;
    static readonly REGISTER = `${this.BASE}/auth/register`;

    static readonly CATEGORIES = `${this.BASE}/video/categories`;
    static readonly UPLOAD = `${this.BASE}/video/upload`;
    static readonly VIDEOSSECTIONS = `${this.BASE}/video/sections`
  }

