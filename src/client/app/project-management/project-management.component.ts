import { Component, OnDestroy } from '@angular/core'
import { NavigationEnd, Router } from '@angular/router'
import { StoreService } from 'core/store.service'

@Component({
  selector: 'project-management',
  styleUrls: [
    './project-management.scss'
  ],
  templateUrl: './project-management.html'
})

export class ProjectManagementComponent implements OnDestroy {
  subRouter: any
  activeLinkIndex = 0
  tabLinks = [
    {
      link: 'projects',
      label: 'Projects',
      searchFor: '/project-management/project'
    }, {
      link: 'releases',
      label: 'Releases',
      searchFor: '/project-management/release'
    }, {
      link: 'stories',
      label: 'Stories',
      searchFor: '/project-management/stor'
    }, {
      link: 'validations',
      label: 'Validations',
      searchFor: '/project-management/validation'
    }
  ]
  constructor(
    private router: Router
  ) {
    this.subRouter = this.router.events
      .filter(event => event instanceof NavigationEnd )
      .subscribe((event: NavigationEnd) => {
        if(event.urlAfterRedirects === '/project-management') {
          this.router.navigate(['/project-management/projects'])
        }
        this.activeLinkIndex = this.tabLinks.findIndex(tabLink => event.urlAfterRedirects.indexOf(tabLink.searchFor) > -1)
    })
  }

  ngOnDestroy() {
    this.subRouter.unsubscribe()
  }
}
