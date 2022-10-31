import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InputControls } from '../shared/inputcontrols';
import { UnitConversion } from '../shared/UnitConversion';

@Component({
    selector: 'app-altitude',
    templateUrl: './altitude.component.html',
    styleUrls: ['./altitude.component.css']
})
export class AltitudeComponent implements OnInit{
    @Output()
    public altitudeChange = new EventEmitter<number>();

    @Output()
    public inputChange = new EventEmitter();

    /** In m.a.s.l */
    @Input()
    public altitude = 0;

    public altitudeForm!: FormGroup;

    private metricLevels = [0, 300, 800, 1500];
    private imperialLevels = [0, 1000, 2600, 5000];

    constructor(private fb: FormBuilder, public units: UnitConversion) { }

    public get altitudeBound(): number {
        return this.units.fromMeters(this.altitude);
    }

    public get smallHill(): string  {
        return this.levelLabel(1);
    }

    public get mountains(): string  {
        return this.levelLabel(2);
    }

    public get highMountains(): string  {
        return this.levelLabel(3);
    }

    public get altitudeValid(): boolean {
        const altitudeField = this.altitudeForm.controls.altitude;
        return InputControls.controlInValid(altitudeField);
    }

    public set altitudeBound(newValue: number) {
        this.altitude = this.units.toMeters(newValue);
        this.altitudeChange.emit(this.altitude);
        this.inputChange.emit();
    }

    public ngOnInit(): void {
        const ranges = this.units.ranges;
        this.altitudeForm = this.fb.group({
            altitude: [this.altitudeBound,
                [Validators.required, Validators.min(ranges.altitude[0]), Validators.max(ranges.altitude[1])]]
        });
    }

    public altitudeChanged(): void {
        this.altitudeBound = this.altitudeForm.value.altitude;
    }

    public seaLevel(): void {
        this.setLevel(0);
    }

    public setHill(): void {
        this.setLevel(1);
    }

    public setMountains(): void {
        this.setLevel(2);
    }

    // we don't change the values for imperial units here
    // simply lets fit closes rounded value
    public setHighMountains(): void {
        this.setLevel(3);
    }

    private setLevel(index: number): void {
        const level = this.selectLevels()[index];
        this.altitudeBound = level;
        this.altitudeForm.patchValue({
            altitude: level
        });
    }

    private levelLabel(index: number): string {
        const level = this.selectLevels()[index];
        return `${level} ${this.units.altitude}`;
    }

    private selectLevels(): number[] {
        if(this.units.imperialUnits) {
            return this.imperialLevels;
        }

        return this.metricLevels;
    }
}
