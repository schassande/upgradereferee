import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { NavController } from '@ionic/angular';


/**
 * Generated class for the user-waiting-validation page.
 *
 */

@Component({
  selector: 'app-user-waiting-validation',
  templateUrl: 'user-waiting-validation.html',
})
export class UserWaitingValidationPage implements OnInit {

  constructor(
    private navController: NavController,
    private route: ActivatedRoute,
    ) {
  }

  ngOnInit() {
  }
}
