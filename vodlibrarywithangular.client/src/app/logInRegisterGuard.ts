import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, GuardResult, MaybeAsync, RouterStateSnapshot } from "@angular/router";
import { AuthService } from "./auth.service";


@Injectable(
  {
    providedIn : 'root'
  }
)

export class LogInRegisterGuard implements CanActivate
{

  constructor(private authService : AuthService)
  {


  }
  canActivate(): boolean
  {
    if(!this.authService.isAuthenticated())
    {
      return true;
    }
    else
      return false;
  }


}
