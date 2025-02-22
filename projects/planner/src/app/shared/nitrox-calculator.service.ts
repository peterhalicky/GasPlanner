import { Injectable } from '@angular/core';
import { NitroxCalculator, DepthConverter, DepthLevels, StandardGases } from 'scuba-physics';
import { OptionsService } from './options.service';

@Injectable()
export class NitroxCalculatorService {
    private _pO2 = 1.4;
    private _fO2 = 21;
    private _mod = 30;
    private calculate: () => void;
    private nitroxCalculator: NitroxCalculator;

    constructor(options: OptionsService) {
        const depthConverter = DepthConverter.simple();
        const depthLevels = new DepthLevels(depthConverter, options.getOptions());
        // providing rounded value for o2 in air to be aligned with UI
        this.nitroxCalculator = new NitroxCalculator(depthLevels, depthConverter, .21);
        this.calculate = this.calculateCurrentMod;
    }

    public get inMod(): boolean {
        return this.calculate === this.calculateCurrentMod;
    }

    public get inBestMix(): boolean {
        return this.calculate === this.calculateBestMix;
    }

    public get inPO2(): boolean {
        return this.calculate === this.calculatePartial;
    }

    public get pO2(): number {
        return this._pO2;
    }

    public get fO2(): number {
        return this._fO2;
    }

    public get ead(): number {
        return this.nitroxCalculator.ead(this._fO2, this._mod);
    }

    public get mod(): number {
        return this._mod;
    }

    public set pO2(newValue: number) {
        this._pO2 = newValue;
        this.calculate();
    }

    public set fO2(newValue: number) {
        this._fO2 = newValue;
        this.calculate();
    }

    public set mod(newValue: number) {
        this._mod = newValue;
        this.calculate();
    }

    public toMod(): void {
        this.calculate = this.calculateCurrentMod;
    }

    public toBestMix(): void {
        this.calculate = this.calculateBestMix;
    }

    public toPO2(): void {
        this.calculate = this.calculatePartial;
    }

    private calculateCurrentMod = () => {
        this._mod = this.nitroxCalculator.mod(this._pO2, this._fO2);
    };

    private calculateBestMix = () => {
        this._fO2 = this.nitroxCalculator.bestMix(this._pO2, this._mod);
    };

    private calculatePartial = () => {
        this._pO2 = this.nitroxCalculator.partialPressure(this._fO2, this._mod);
    };
}
