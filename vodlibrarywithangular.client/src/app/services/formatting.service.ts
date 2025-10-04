import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FormattingService {

  constructor() { }


  formatNum(views? : number)
  {

    if(views)
    {
      if(Math.floor(views / 1_000_000) > 0)
      return Math.floor(views / 1_000_000) + 'M'

      else if(Math.floor(views / 1_000) > 0)
        return Math.floor(views / 1_000) + 'K'
    }


    return views
  }

  formatDateTimeReWrite(date : Date) : string
  {
    const Now = new Date();

    const gapInMs = Now.getTime() - date.getTime();


    const gapInMinutes = Math.floor(gapInMs/1000/60);
    if(gapInMinutes < 60)
    {
      return  gapInMinutes === 1 ? gapInMinutes + ' minute ago' : gapInMinutes + ' minutes ago';
    }

    const gapInHrs = Math.floor(gapInMinutes / 60)
    if(gapInHrs < 24)
    {
      return gapInHrs === 1 ? gapInHrs + ' hour ago' : gapInHrs + ' hours ago';
    }

    const gapInDays = Math.floor(gapInHrs / 24);
    if(gapInDays < 31)
    {
        return gapInDays === 1 ? gapInDays + ' day ago' : gapInDays + ' days ago';
    }

    let month = (Now.getFullYear() - date.getFullYear()) * 12;
    month += Now.getMonth() - date.getMonth();
    if(Now.getDate() < date.getDate()) month--;

    if(month < 12)
    {
      return month > 1 ? month + ' months ago' : month + ' month ago';
    }

    const gapInYears = Math.floor(month / 12)
    let answer = gapInYears > 1 ? gapInYears + ' years ago' : gapInYears + ' year ago';
    const moduleDivisior = month % 12;

    if(moduleDivisior > 0)
    {
      let concat = moduleDivisior > 1 ? moduleDivisior + ' months ago' : moduleDivisior + ' month ago';
      answer = answer + concat;
    }
    return answer;

  }

  convertVideoTotalSecondsDurationToTimeFormat(totalSeconds : number)
    {
      let hours : number = 0;

      totalSeconds = totalSeconds/60/60;

      hours = Math.floor(totalSeconds);

      totalSeconds = totalSeconds - hours;

      let minutes : number = 0;

      totalSeconds = totalSeconds * 60;
      minutes = Math.floor(totalSeconds);

      totalSeconds = totalSeconds - minutes;

      let seconds : number = 0 ;

      totalSeconds = totalSeconds * 60;

      seconds = Math.floor(totalSeconds);

      return `${hours === 0 ? '' : `${hours}:`}${minutes === 0 ? '0:' : `${minutes}:`}${seconds < 10 ? `0${seconds}` : seconds}`

    }
}
