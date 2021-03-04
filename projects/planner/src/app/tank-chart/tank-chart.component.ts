import { Component, Input, OnInit } from '@angular/core';
import { Tank } from 'scuba-physics';

@Component({
    selector: 'app-tankchart',
    templateUrl: './tank-chart.component.html',
    styleUrls: ['./tank-chart.component.css']
})
export class TankChartComponent {


    @Input()
    public tank: Tank = new Tank(0, 0, 0);

    constructor() { }

}