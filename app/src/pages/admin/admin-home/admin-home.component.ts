import { NavController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/service/UserService';
import { DateService } from 'src/app/service/DateService';

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.scss'],
})
export class AdminHomeComponent implements OnInit {
  downloading = false;
  constructor(
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
      a.download = `Referee-Coaches_${this.dateService.date2string(new Date())}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      this.downloading = false;
    });
  }
}
