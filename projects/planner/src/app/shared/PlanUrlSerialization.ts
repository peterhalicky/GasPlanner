import { Injectable } from '@angular/core';
import _ from 'lodash';
import {
    Diver, Options, SafetyStop, Salinity, Segment
} from 'scuba-physics';
import { OptionsService } from './options.service';
import { Plan } from './plan.service';
import { PlannerService } from './planner.service';
import { PlanValidation } from './PlanValidation';
import { PreferencesFactory } from './preferences.factory';
import {
    AppPreferencesDto, DiverDto, OptionsDto, SegmentDto, TankDto
} from './serialization.model';
import { TanksService } from './tanks.service';
import { ViewSwitchService } from './viewSwitchService';
import { TankBound } from './models';
import { UnitConversion } from './UnitConversion';

class ParseContext {
    private static readonly trueValue = '1';
    public readonly paramValues: string[];

    constructor(source: string, separator: string) {
        this.paramValues = source.split(separator);
    }

    public static serializeBoolean(value: boolean): string {
        return value ? ParseContext.trueValue : '0';
    }

    public static deserializeBoolean(value: string): boolean {
        return (value === ParseContext.trueValue);
    }

    public parseNumber(index: number): number {
        const toParse = this.paramValues[index];
        return Number(toParse);
    }

    public parseEnum<TType>(index: number): TType {
        const toParse = this.paramValues[index];
        return <TType>(<unknown>Number(toParse));
    }

    public parseBoolean(index: number): boolean {
        const toParse = this.paramValues[index];
        return ParseContext.deserializeBoolean(toParse);
    }

    public processValues(valueSeparator: string, action: (c: ParseContext) => void): void {
        for (let index = 0; index < this.paramValues.length; index++) {
            const partContext = this.toPartContext(index, valueSeparator);
            action(partContext);
        }
    }

    public toPartContext(index: number, separator: string): ParseContext {
        const part = this.paramValues[index];
        return new ParseContext(part, separator);
    }
}

/**
 * Serialize/Deserialize planned dives to string url parameter value.
 * Since we have no custom strings inside our objects, only numbers and enum values, we should be safe.
 * This is done using
 * 1. convert to json
 * 2. convert to Base64
 * 3. Encode as url parameter
 **/
@Injectable()
export class PlanUrlSerialization {
    constructor(
        private planner: PlannerService,
        private viewSwitch: ViewSwitchService,
        private units: UnitConversion,
        private tanksService: TanksService,
        private plan: Plan,
        private options: OptionsService,
        private preferences: PreferencesFactory
    ) { }

    private static parseDto(url: string): AppPreferencesDto {
        const params = new URLSearchParams(url);
        const appSettingsParam = params.get('ao') || '';
        const optionsParam = params.get('o') || '';
        const diverParam = params.get('di') || '';
        const tanksParam = params.get('t') || '';
        const depthsParam = params.get('de') || '';

        const tanks = PlanUrlSerialization.fromTanksParam(tanksParam);
        const parsed: AppPreferencesDto = {
            options: PlanUrlSerialization.fromAppSettingsParam(appSettingsParam),
            dives: [{
                options: PlanUrlSerialization.fromOptionsParam(optionsParam),
                diver: PlanUrlSerialization.fromDiverParam(diverParam),
                tanks: tanks,
                plan: PlanUrlSerialization.fromDepthsParam(tanks, depthsParam),
            }]
        };

        // for imperial units the string is long because of precise values,
        // consider rounding to 6 decimal places
        return parsed;
    }

    private static fromAppSettingsParam(appSettings: string) {
        const context = new ParseContext(appSettings, ',');
        return {
            isComplex: context.parseBoolean(0),
            imperialUnits: context.parseBoolean(1),
            language: 'en'
        };
    }

    private static fromOptionsParam(optionsParam: string): OptionsDto {
        const context = new ParseContext(optionsParam, ',');
        const result: OptionsDto = {
            altitude: context.parseNumber(0),
            ascentSpeed50perc: context.parseNumber(1),
            ascentSpeed50percTo6m: context.parseNumber(2),
            ascentSpeed6m: context.parseNumber(3),
            decoStopDistance: context.parseNumber(4),
            descentSpeed: context.parseNumber(5),
            gasSwitchDuration: context.parseNumber(6),
            gfHigh: context.parseNumber(7),
            gfLow: context.parseNumber(8),
            lastStopDepth: context.parseNumber(9),
            maxDecoPpO2: context.parseNumber(10),
            maxEND: context.parseNumber(11),
            maxPpO2: context.parseNumber(12),
            minimumAutoStopDepth: context.parseNumber(13),
            oxygenNarcotic: context.parseBoolean(14),
            problemSolvingDuration: context.parseNumber(15),
            roundStopsToMinutes: context.parseBoolean(16),
            safetyStop: context.parseEnum<SafetyStop>(17),
            salinity: context.parseEnum<Salinity>(18),
        };
        return result;
    }

    private static toOptionsParam(o: Options): string {
        const oxygenNarcotic = ParseContext.serializeBoolean(o.oxygenNarcotic);
        const roundStopsToMinutes = ParseContext.serializeBoolean(o.roundStopsToMinutes);
        const optionsParam = `${o.altitude},` +
            `${o.ascentSpeed50perc},${o.ascentSpeed50percTo6m},${o.ascentSpeed6m},` +
            `${o.decoStopDistance},${o.descentSpeed},${o.gasSwitchDuration},` +
            `${o.gfHigh},${o.gfLow},${o.lastStopDepth},${o.maxDecoPpO2},${o.maxEND},` +
            `${o.maxPpO2},${o.minimumAutoStopDepth},${oxygenNarcotic},${o.problemSolvingDuration},` +
            `${roundStopsToMinutes},${o.safetyStop},${o.salinity}`;
        return optionsParam;
    }

    private static fromDiverParam(parseParam: string): DiverDto {
        const context = new ParseContext(parseParam, ',');
        const result: DiverDto = {
            rmv: context.parseNumber(0),
            maxPpO2: context.parseNumber(1),
            maxDecoPpO2: context.parseNumber(2)
        };

        return result;
    }

    private static toDiverParam(di: Diver): string {
        const result = `${di.rmv},${di.maxPpO2},${di.maxDecoPpO2}`;
        return result;
    }

    private static fromTanksParam(parseParam: string): TankDto[] {
        let result: TankDto[] = [];
        const tanksContext = new ParseContext(parseParam, ',');

        tanksContext.processValues('-', (context: ParseContext) => {
            const tank: TankDto = {
                id: context.parseNumber(0),
                size: context.parseNumber(1),
                workPressure: context.parseNumber(2),
                startPressure: context.parseNumber(3),
                gas: {
                    fO2: context.parseNumber(4),
                    fHe: context.parseNumber(5)
                },
                // consumption properties are calculated, so ignoring them
            };
            result.push(tank);
        });

        result = _.sortBy(result, [(t) => t.id]);
        return result;
    }

    private static toTanksParam(tanks: TankBound[]): string {
        const result: string[] = [];

        // consumption and reserve are calculated values, we don't need to serialize them here
        tanks.forEach((t) => {
            const tank = t.tank;
            const gas = tank.gas;
            const workPressure = t.workingPressureBars;
            const tParam = `${tank.id}-${tank.size}-${workPressure}-${tank.startPressure}-${gas.fO2}-${gas.fHe}`;
            result.push(tParam);
        });
        return result.join(',');
    }

    private static fromDepthsParam(tanks: TankDto[], parseParam: string): SegmentDto[] {
        const result: SegmentDto[] = [];
        const segContext = new ParseContext(parseParam, ',');
        let last: SegmentDto;

        segContext.processValues('-', (context: ParseContext) => {
            const startDepth = last ? last.endDepth : 0;
            const segment = this.toSegment(context, tanks, startDepth);
            last = segment;
            result.push(segment);
        });

        return result;
    }

    private static toSegment(context: ParseContext, tanks: TankDto[], startDepth: number): SegmentDto {
        const segment: SegmentDto = {
            startDepth: startDepth,
            endDepth: context.parseNumber(1),
            duration: context.parseNumber(2),
            tankId: 1,
            gas: {
                fO2: 0,
                fHe: 0
            }
        };

        const tankId = context.parseNumber(3);

        if (0 < tankId && tankId <= tanks.length) {
            const tank = tanks[tankId - 1];
            segment.tankId = tankId;
            segment.gas.fO2 = tank.gas.fO2;
            segment.gas.fHe = tank.gas.fHe;
        }

        return segment;
    }

    private static toDepthsParam(segments: Segment[]): string {
        const result: string[] = [];

        segments.forEach((s: Segment) => {
            // here tanks is always defined
            const tankId = s.tank ? s.tank.id : 0;
            // gas isn't relevant, because in plan, gas is defined by tank
            const tParam = `${s.startDepth}-${s.endDepth}-${s.duration}-${tankId}`;
            result.push(tParam);
        });

        return result.join(',');
    }

    public toUrl(): string {
        const tanksParam = PlanUrlSerialization.toTanksParam(this.tanksService.tanks);
        const depthsParam = PlanUrlSerialization.toDepthsParam(this.plan.segments);
        const diParam = PlanUrlSerialization.toDiverParam(this.options.diver);
        const optionsParam = PlanUrlSerialization.toOptionsParam(this.options.getOptions());
        const appOptions = this.toAppOptions();
        const result = `t=${tanksParam}&de=${depthsParam}&di=${diParam}&o=${optionsParam}&ao=${appOptions}`;
        return result;
    }

    public fromUrl(url: string): void {
        try {
            if (!url) {
                return;
            }

            const decodedUrl = decodeURIComponent(url);
            const parsed = PlanUrlSerialization.parseDto(decodedUrl);
            // use the same concept as with  preferences, so we can skip loading, if deserialization fails.
            const imperial = parsed.options.imperialUnits;
            const isValid = new PlanValidation(imperial).validate(parsed);

            if (isValid) {
                this.preferences.applyLoaded(parsed);
                this.planner.calculate();
            } else {
                console.log('Unable to load planner from url parameters, due to invalid data.');
            }
        } catch {
            console.log('Failed loading of planner from url parameters.');
        }
    }

    private toAppOptions(): string {
        const isComplex = ParseContext.serializeBoolean(this.viewSwitch.isComplex);
        const imperial = ParseContext.serializeBoolean(this.units.imperialUnits);
        return `${isComplex},${imperial}`;
    }
}
