import { Component, OnInit } from '@angular/core';
import { map } from 'rxjs/operators';
import { UpgradeCriteria } from 'src/app/model/upgrade';
import { DateService } from 'src/app/service/DateService';
import { UpgradeCriteriaService } from 'src/app/service/UpgradeCriteriaService';

@Component({
  selector: 'app-upgrade-criteria',
  templateUrl: './upgrade-criteria.component.html',
  styleUrls: ['./upgrade-criteria.component.scss'],
})
export class UpgradeCriteriaComponent implements OnInit {

  upgradeCriterias: UpgradeCriteria[] = [];
  upgradeCriteria: UpgradeCriteria;

  get upgradeCriteriaId(): string {
    return this.upgradeCriteria ? this.upgradeCriteria.id : '';
  }

  set upgradeCriteriaId(id: string) {
    this.upgradeCriteria = this.upgradeCriterias.find(uc => uc.id === id);
  }

  constructor(
    public dateService: DateService,
    private upgradeCriteriaService: UpgradeCriteriaService
  ) { }

  ngOnInit() {
    this.upgradeCriteriaService.all().pipe(
      map(ruc => {
        if (ruc.data) {
          this.upgradeCriterias = ruc.data;
          if (this.upgradeCriterias.length > 0) {
            this.upgradeCriteria = this.upgradeCriterias[0];
          }
        } else {
          this.upgradeCriterias = [];
        }
      })
    ).subscribe();
  }

  onSwipe() {
  }
}
