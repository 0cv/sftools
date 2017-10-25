import { Component, OnDestroy, OnInit } from '@angular/core'
import { NavigationEnd, Router } from '@angular/router'
import { User, LoadingSpinnerService, StoreService } from 'core'
import 'rxjs/add/operator/filter'
/*
 * App Component
 * Top Level Component
 */
@Component({
  selector: 'app',
  styleUrls: [
    './app.scss'
  ],
  templateUrl: './app.html'
})

export class AppComponent implements OnDestroy, OnInit {
  isSpinnerShown: boolean = false
  activeLinkIndex = 0
  isLoggedIn = false
  subRouter: any
  tabLinks = [
    {
      label: 'Connections',
      link: '/connections',
      searchFor: '/connection'
    }, {
      label: 'Settings',
      link: '/settings',
      searchFor: '/settings'
    }, {
      label: 'Private Keys',
      link: '/private-keys',
      searchFor: '/private-key'
    }, {
      label: 'Git Servers',
      link: '/git-servers',
      searchFor: '/git-server'
    }, {
      label: 'Deployment',
      link: '/deployment',
      searchFor: '/deployment'
    }, {
      label: 'Project Management',
      link: '/project-management',
      searchFor: '/project-management'
    }
  ]
  constructor(
    private router: Router,
    private user: User,
    private store: StoreService,
    private loadingSpinnerService: LoadingSpinnerService
  ) {
    this.subRouter = this.router.events
      .filter(event => event instanceof NavigationEnd )
      .subscribe((event: NavigationEnd) => {
        //we find the active tab
        this.activeLinkIndex = this.tabLinks.findIndex(tabLink => event.urlAfterRedirects.indexOf(tabLink.searchFor) > -1)

        //check whether the user is logged in
        if( event.urlAfterRedirects === '/login' ||
            event.urlAfterRedirects === '/reset-password' ||
            event.urlAfterRedirects === '/new-user') {
          this.isLoggedIn = false
        } else {
          this.isLoggedIn = true
        }
    })
  }


  ngOnDestroy() {
    this.subRouter.unsubscribe()
  }

  ngOnInit() {
    this.user.isAuthenticated().subscribe((isAuthenticated) => {
      //if the url is not matching the authentication of the user, we do a redirect
      if(!isAuthenticated && !this.isActive(['/login', '/reset-password', '/new-user'])) {
        this.router.navigate(['/login'])
      } else if(isAuthenticated && (this.isActive(['/login', '/reset-password', '/new-user']) || location.pathname === '/')) {
        this.router.navigate(['/connections'])
      }
    })

    this.loadingSpinnerService.spinnerStateAnnounced$.subscribe(
      isShown => {
        this.isSpinnerShown = isShown
      })
  }

  isActive(instructions: any[]): boolean {
    return instructions.some((instr) => location.pathname.startsWith(instr))
  }

  logout() {
    this.user.logout().subscribe(() => {
      //clean store
      this.store.clean()

      //go to login
      this.router.navigate(['/login'])
    })
  }
}
