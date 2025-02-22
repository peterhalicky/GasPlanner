import { Component, OnInit } from '@angular/core';
import { faBatteryHalf } from '@fortawesome/free-solid-svg-icons';
import { RangeConstants, UnitConversion } from '../shared/UnitConversion';
import { DelayedScheduleService } from '../shared/delayedSchedule.service';
import { GasToxicity } from '../shared/gasToxicity.service';
import { takeUntil } from 'rxjs';
import { NonNullableFormBuilder, FormGroup, FormControl } from '@angular/forms';
import { InputControls } from '../shared/inputcontrols';
import { ValidatorGroups } from '../shared/ValidatorGroups';
import { Streamed } from '../shared/streamed';
import { TankBound } from '../shared/models';
import { TanksService } from '../shared/tanks.service';
import { Plan } from '../shared/plan.service';
import { Precision, TankTemplate } from 'scuba-physics';
import { OptionsService } from '../shared/options.service';

interface TankForm {
    firstTankSize: FormControl<number>;
    firstTankStartPressure: FormControl<number>;
    workPressure?: FormControl<number>;
}

@Component({
    selector: 'app-tanks-simple',
    templateUrl: './tanks-simple.component.html',
    styleUrls: ['./tanks-simple.component.scss']
})
export class TanksSimpleComponent extends Streamed implements OnInit {
    public icon = faBatteryHalf;
    public toxicity: GasToxicity;
    public tanksForm!: FormGroup<TankForm>;

    constructor(
        private options: OptionsService,
        private tanksService: TanksService,
        public units: UnitConversion,
        private fb: NonNullableFormBuilder,
        private inputs: InputControls,
        private validators: ValidatorGroups,
        private delayedCalc: DelayedScheduleService,
        private plan: Plan) {
        super();
        this.toxicity = this.options.toxicity;
    }

    public get firstTank(): TankBound {
        return this.tanksService.firstTank;
    }

    public get ranges(): RangeConstants {
        return this.units.ranges;
    }

    public get firstTankSizeInvalid(): boolean {
        const firstTankSize = this.tanksForm.controls.firstTankSize;
        return this.inputs.controlInValid(firstTankSize);
    }

    public get workPressureInvalid(): boolean {
        const workPressure = this.tanksForm.controls.workPressure;
        return this.inputs.controlInValid(workPressure);
    }

    public get firstTankStartPressureInvalid(): boolean {
        const firstTankStartPressure = this.tanksForm.controls.firstTankStartPressure;
        return this.inputs.controlInValid(firstTankStartPressure);
    }

    public ngOnInit(): void {
        this.tanksForm = this.fb.group({
            firstTankSize: [Precision.round(this.firstTank.size, 1), this.validators.tankSize],
            firstTankStartPressure: [Precision.round(this.firstTank.startPressure, 1), this.validators.tankPressure]
        });

        if (this.units.imperialUnits) {
            const workPressureControl = this.fb.control(
                Precision.round(this.firstTank.workingPressure, 1), this.validators.tankPressure);
            this.tanksForm.addControl('workPressure', workPressureControl);
        }

        this.tanksService.tanksReloaded.pipe(takeUntil(this.unsubscribe$))
            .subscribe(() => this.reloadAll());
    }

    public gasSac(): number {
        const tank = this.firstTank.tank;
        const sac = this.options.diver.gasSac(tank);
        return this.units.fromBar(sac);
    }

    public assignBestMix(): void {
        const maxDepth = this.plan.maxDepth;
        this.firstTank.o2 = this.toxicity.bestNitroxMix(maxDepth);
        this.delayedCalc.schedule();
    }

    public applyTemplate(template: TankTemplate): void {
        if (this.tanksForm.invalid) {
            return;
        }

        this.tanksForm.patchValue({
            workPressure: template.workingPressure,
        });

        this.applySimple();
    }

    public applySimple(): void {
        if (this.tanksForm.invalid) {
            return;
        }

        const values = this.tanksForm.value;
        this.firstTank.size = Number(values.firstTankSize);
        this.firstTank.workingPressure = Number(values.workPressure);
        this.firstTank.startPressure = Number(values.firstTankStartPressure);
        this.delayedCalc.schedule();
    }

    private reloadAll(): void {
        this.tanksForm.patchValue({
            firstTankSize: Precision.round(this.firstTank.size, 1),
            workPressure: Precision.round(this.firstTank.workingPressure, 1),
            firstTankStartPressure: Precision.round(this.firstTank.startPressure, 1),
        });
    }
}
