import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';
import { GasesComponent } from './gases/gases.component';
import { DiverComponent } from './diver/diver.component';
import { PlanComponent } from './plan/plan.component';
import { DiveComponent } from './dive/dive.component';
import { PlannerService } from './shared/planner.service';
import { PreferencesService } from './shared/preferences.service';
import { MainMenuComponent } from './mainmenu/mainmenu.component';
import { AppRoutingModule } from './app-routing.module';
import { DashboardComponent } from './dashboard/dashboard.component';

@NgModule({
  declarations: [
    AppComponent,
    GasesComponent,
    DiverComponent,
    PlanComponent,
    DiveComponent,
    MainMenuComponent,
    DashboardComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    NgbModule.forRoot(),
    AppRoutingModule
  ],
  exports: [],
  providers: [ PlannerService, PreferencesService ],
  bootstrap: [AppComponent]
})
export class AppModule { }
