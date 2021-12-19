import { NavController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/service/UserService';
import { DateService } from 'src/app/service/DateService';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.scss'],
})
export class AdminHomeComponent implements OnInit {
  downloading = false;
  constructor(
    private connectedUserService: ConnectedUserService,
    private dateService: DateService,
    private navController: NavController,
    private userService: UserService
  ) { }

  ngOnInit() {}

  onSwipe(event) {
    // console.log('onSwipe', event);
    if (event.direction === 4) {
      this.navController.navigateRoot(`/home`);
    }
  }

  exportRefereeCoachList() {
    this.downloading = true;
    const SEP = ',';
    this.userService.searchRefereeCoaches(undefined).subscribe((rusers) => {
      const content = `Id${SEP}First Name${SEP}Last Name${SEP}Email${SEP}Level\n` +
        rusers.data
          .map(user => user.id + SEP + user.firstName + SEP + user.lastName + SEP + user.email + SEP + user.refereeCoach.refereeCoachLevel)
          .join('\n');
      const oMyBlob = new Blob([content], {type : 'text/csv'});
      const url = URL.createObjectURL(oMyBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Upgrade-Referee_Coaches_${this.dateService.date2string(new Date())}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      this.downloading = false;
    });
  }
  exportRefereeList() {
    this.downloading = true;
    const SEP = ',';
    this.userService.searchReferees(undefined).subscribe((rusers) => {
      const content = `Id${SEP}First Name${SEP}Last Name${SEP}Email${SEP}Country${SEP}Referee Level${SEP}Referee Category${SEP}Referee Next Level\n` +
        rusers.data
          .filter(ref => {
            return ref.accountStatus === 'ACTIVE'
              && ref.applications.filter(app => app.name === 'Upgrade' && app.role === 'REFEREE').length > 0
              && ref.referee && ref.referee.nextRefereeLevel;
          }).map(user => user.id + SEP + user.firstName + SEP + user.lastName + SEP + user.email + SEP + user.country
            + SEP + user.referee.refereeLevel + SEP + user.referee.refereeCategory + SEP + user.referee.nextRefereeLevel)
          .join('\n');
      const oMyBlob = new Blob([content], {type : 'text/csv'});
      const url = URL.createObjectURL(oMyBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Upgrade-Referees-_${this.dateService.date2string(new Date())}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      this.downloading = false;
    });
  }
  exportNDRList() {
    this.downloading = true;
    const SEP = ',';
    this.userService.searchUsers({ role: 'NDR', region: this.connectedUserService.getCurrentUser().region}).subscribe((rusers) => {
      const content = `Id${SEP}First Name${SEP}Last Name${SEP}Email${SEP}Country\n` +
        rusers.data
          .filter(ref => {
            return ref.accountStatus === 'ACTIVE'
              && ref.applications.filter(app => app.name === 'Upgrade' && app.role === 'NDR').length > 0;
          }).map(user => user.id + SEP + user.firstName + SEP + user.lastName + SEP + user.email + SEP + user.country)
          .join('\n');
      const oMyBlob = new Blob([content], {type : 'text/csv'});
      const url = URL.createObjectURL(oMyBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Upgrade-NDRs-_${this.dateService.date2string(new Date())}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      this.downloading = false;
    });
  }
}
