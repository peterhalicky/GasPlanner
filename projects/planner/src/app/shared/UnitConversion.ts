import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
    DefaultValues, ImperialDefaults, ImperialUnits,
    MetricDefaults, MetricUnits, Units
} from 'scuba-physics';

@Injectable()
export class UnitConversion {
    /**
     * Only to be able immediately refresh Diver component, since in the same view.
     * Other components refresh next time their are shown.
     */
    public ranges$: BehaviorSubject<RangeConstants>;
    private _ranges: RangeConstants;
    private _imperialUnits = false;
    private _defaults: DefaultValues;

    constructor() {
        this._ranges = UnitConversion.createMetricRanges();
        this.ranges$ = new BehaviorSubject<RangeConstants>(this.ranges);
        this._defaults = new MetricDefaults();
    }

    public get ranges(): RangeConstants {
        return this._ranges;
    }

    public get defaults(): DefaultValues {
        return this._defaults;
    }

    public get length(): string {
        return this.current.lengthShortcut;
    }

    public get pressure(): string {
        return this.current.pressureShortcut;
    }

    public get volume(): string {
        return this.current.volumeShortcut;
    }

    public get altitude(): string {
        return this.current.altitudeShortcut;
    }

    public get speed(): string {
        return this.length + perMinute;
    }

    public get sac(): string {
        return this.pressure + perMinute;
    }

    public get rmv(): string {
        return this.volume + perMinute;
    }

    public get density(): string {
        return this.current.densityShortcut;
    }

    public get imperialUnits(): boolean {
        return this._imperialUnits;
    }

    private get current(): Units {
        return this.ranges.units;
    }

    public set imperialUnits(newValue: boolean) {
        this._imperialUnits = newValue;

        if (this._imperialUnits) {
            this._ranges = UnitConversion.createImperial();
            this._defaults = new ImperialDefaults();
        } else {
            this._ranges = UnitConversion.createMetricRanges();
            this._defaults = new MetricDefaults();
        }

        this.ranges$.next(this.ranges);
    }

    public static createMetricRanges(): RangeConstants {
        return new MetricRanges();
    }

    public static createImperial(): RangeConstants {
        return new ImperialRanges();
    }

    public toLiter(volume: number): number {
        return this.current.toLiter(volume);
    }

    public fromLiter(liters: number): number {
        return this.current.fromLiter(liters);
    }

    public toMeters(length: number): number {
        return this.current.toMeters(length);
    }

    public fromMeters(meters: number): number {
        return this.current.fromMeters(meters);
    }

    public toBar(length: number): number {
        return this.current.toBar(length);
    }

    public fromBar(meters: number): number {
        return this.current.fromBar(meters);
    }

    /** working pressure in bars */
    public fromTankLiters(liters: number, workingPressure: number): number {
        return this.current.fromTankLiters(liters, workingPressure);
    }

    /** working pressure in bars */
    public toTankLiters(cuftVolume: number, workingPressure: number): number {
        return this.current.toTankLiters(cuftVolume, workingPressure);
    }

    public fromGramPerLiter(density: number): number {
        return this.current.fromGramPerLiter(density);
    }
}


/** All numeric values are in current units of the provider, e.g. not normalized to metrics only. */
export interface RangeConstants {
    units: Units;
    tankSize: [number, number];
    tankSizeLabel: string;
    tankPressure: [number, number];
    tankPressureLabel: string;
    nitroxOxygen: [number, number];
    nitroxOxygenLabel: string;
    trimixOxygen: [number, number];
    trimixOxygenLabel: string;
    tankHe: [number, number];
    tankHeLabel: string;
    diverRmv: [number, number];
    diverRmvLabel: string;
    ppO2: [number, number];
    /** Number of decimal places to round rmv values */
    rmvRounding: number;
    depth: [number, number];
    depthLabel: string;
    narcoticDepth: [number, number];
    narcoticDepthLabel: string;
    lastStopDepth: [number, number];
    lastStopDepthLabel: string;
    duration: [number, number];
    durationLabel: string;
    altitude: [number, number];
    altitudeLabel: string;
    speed: [number, number];
    speedLabel: string;
}

const perMinute = '/min';
const toLabel = (range: [number, number], unit: string): string => `${range[0]} - ${range[1]} ${unit}`;

class MetricRanges implements RangeConstants {
    public readonly units = new MetricUnits();
    public readonly altitude: [number, number] = [0, 5000];
    public readonly altitudeLabel: string = toLabel(this.altitude, this.units.altitudeShortcut);
    public readonly depth: [number, number] = [1, 350];
    public readonly depthLabel: string = toLabel(this.depth, this.units.lengthShortcut);
    public readonly diverRmv: [number, number] = [5, 90];
    public readonly diverRmvLabel: string = toLabel(this.diverRmv, this.units.volumeShortcut + perMinute);
    public readonly duration: [number, number] = [1, 1440];
    public readonly durationLabel: string = toLabel(this.duration, 'min');
    public readonly narcoticDepth: [number, number] = [1, 100];
    public readonly narcoticDepthLabel: string = toLabel(this.narcoticDepth, this.units.lengthShortcut);
    public readonly nitroxOxygen: [number, number] = [21, 100];
    public readonly nitroxOxygenLabel: string = toLabel(this.nitroxOxygen, '%');
    public readonly lastStopDepth: [number, number] = [3, 6];
    public readonly lastStopDepthLabel: string = toLabel(this.lastStopDepth, this.units.lengthShortcut);
    public readonly ppO2: [number, number] = [0.21, 3];
    public readonly rmvRounding = 2;
    public readonly tankHe: [number, number] = [0, 99];
    public readonly tankHeLabel: string = toLabel(this.tankHe, '%');
    public readonly tankPressure: [number, number] = [30, 350];
    public readonly tankPressureLabel: string = toLabel(this.tankPressure, this.units.pressureShortcut);
    public readonly tankSize: [number, number] = [1, 50];
    public readonly tankSizeLabel: string = toLabel(this.tankSize, this.units.volumeShortcut);
    public readonly trimixOxygen: [number, number] = [1, 100];
    public readonly trimixOxygenLabel: string = toLabel(this.trimixOxygen, '%');
    public readonly speed: [number, number] = [0.1, 100];
    public readonly speedLabel: string = toLabel(this.speed, this.units.lengthShortcut + perMinute);

    constructor() { }
}

class ImperialRanges implements RangeConstants {
    public readonly units = new ImperialUnits();
    public readonly altitude: [number, number] = [0, 16500];
    public readonly altitudeLabel: string = toLabel(this.altitude, this.units.altitudeShortcut);
    public readonly depth: [number, number] = [3, 1150];
    public readonly depthLabel: string = toLabel(this.depth, this.units.lengthShortcut);
    public readonly diverRmv: [number, number] = [0.17, 3.178];
    public readonly diverRmvLabel: string = toLabel(this.diverRmv, this.units.volumeShortcut + perMinute);
    public readonly duration: [number, number] = [1, 1440];
    public readonly durationLabel: string = toLabel(this.duration, 'min');
    public readonly narcoticDepth: [number, number] = [1, 300];
    public readonly narcoticDepthLabel: string = toLabel(this.narcoticDepth, this.units.lengthShortcut);
    public readonly nitroxOxygen: [number, number] = [21, 100];
    public readonly nitroxOxygenLabel: string = toLabel(this.nitroxOxygen, '%');
    public readonly lastStopDepth: [number, number] = [10, 20];
    public readonly lastStopDepthLabel: string = toLabel(this.lastStopDepth, this.units.lengthShortcut);
    public readonly ppO2: [number, number] = [0.21, 3];
    public readonly rmvRounding = 4;
    public readonly tankHe: [number, number] = [0, 99];
    public readonly tankHeLabel: string = toLabel(this.tankHe, '%');
    public readonly tankPressure: [number, number] = [400, 5100];
    public readonly tankPressureLabel: string = toLabel(this.tankPressure, this.units.pressureShortcut);
    public readonly tankSize: [number, number] = [1, 300];
    public readonly tankSizeLabel: string = toLabel(this.tankSize, this.units.volumeShortcut);
    public readonly trimixOxygen: [number, number] = [1, 100];
    public readonly trimixOxygenLabel: string = toLabel(this.trimixOxygen, '%');
    public readonly speed: [number, number] = [1, 300];
    public readonly speedLabel: string = toLabel(this.speed, this.units.lengthShortcut + perMinute);

    constructor() { }
}
