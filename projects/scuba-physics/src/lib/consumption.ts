import { BuhlmannAlgorithm, Options } from './BuhlmannAlgorithm';
import { DepthConverter } from './depth-converter';
import { Diver } from './Diver';
import { Gases } from './Gases';
import { CalculatedProfile } from './Profile';
import { Segment, Segments, SegmentsFactory } from './Segments';
import { Tank, Tanks } from './Tanks';
import { Time } from './Time';


class ConsumptionSegment {
    /** in seconds */
    public startTime = 0;
    /** in seconds */
    public endTime = 0;
    /** in meters */
    private _startDepth = 0;
    /** in meters */
    private _endDepth = 0;

    /**
     * @param duration in seconds
     * @param newDepth in meters
     * @param previousDepth in meters
     */
    constructor(public duration: number, newDepth: number, previousDepth: number = 0) {
        this.endTime = Math.round(duration * 100) / 100;
        this._endDepth = newDepth;
        this._startDepth = previousDepth;
    }

    public static fromSegment(segment: Segment): ConsumptionSegment {
        return new ConsumptionSegment(segment.duration, segment.endDepth, segment.startDepth);
    }

    /** in meters */
    public get startDepth(): number {
        return this._startDepth;
    }

    /** in meters */
    public get endDepth(): number {
        return this._endDepth;
    }

    /** in meters */
    public get averageDepth(): number {
        return (this.startDepth + this.endDepth) / 2;
    }
}

interface  Interval {
    /** seconds */
    left: number;

    /** seconds */
    right: number;
}

/**
 * Calculates tank consumptions during the dive and related variables
 * (e.g. rock bottom, turn pressure, turn time)
 */
export class Consumption {
    /** Minimum bars to keep in tank, even for shallow dives */
    public static readonly minimumRockBottom = 30;

    constructor(private depthConverter: DepthConverter) { }

    private static calculateDecompression(segments: Segments, tanks: Tank[], options: Options): CalculatedProfile {
        const bGases = new Gases();
        const firstTank = tanks[0];
        const bGas = firstTank.gas;
        bGases.addBottomGas(bGas);

        // everything except first gas is considered as deco gas
        tanks.slice(1, tanks.length).forEach((gas) => {
            const decoGas = gas.gas;
            bGases.addDecoGas(decoGas);
        });

        const algorithm = new BuhlmannAlgorithm();
        const segmentsCopy = segments.copy();
        const profile = algorithm.calculateDecompression(options, bGases, segmentsCopy);
        return profile;
    }

    /**
     * Updates tanks consumption based on segments
     * @param segments Profile generated by algorithm including user defined + generated ascent,
     *                 the array needs have at least 3 items (descent, swim, ascent).
     * @param userSegments The number of segments from the profile defined by user, the rest is counted as calculated ascent.
     * @param tanks: All tanks used to generate the profile, their gases need to fit all used in segments param
     * @param sac diver surface air consumption in Liters/minute.
     */
    public consumeFromTanks(segments: Segment[], userSegments: number, tanks: Tank[], diver: Diver): void {
        if (segments.length < 3) {
            throw new Error('Profile needs to contain at least three segments.');
        }

        Tank.resetConsumption(tanks);
        const remainToConsume = this.consumeByTanks(segments, diver.sac);
        this.consumeByGases(segments, tanks, diver.sac, remainToConsume);
        const ascent = SegmentsFactory.ascent(segments, userSegments);
        this.updateReserve(ascent, tanks, diver.stressSac);
    }

    /**
     * We cant provide this method for multilevel dives, because we don't know which segment to extend
     * @param sourceSegments User defined profile
     * @param tanks The tanks used during the dive to check available gases
     * @param diver Consumption SAC definition
     * @param options ppO2 definitions needed to estimate ascent profile
     * @returns Number of minutes representing maximum time we can spend as bottom time.
     * Returns 0 in case the duration is shorter than user defined segments.
     */
    public calculateMaxBottomTime(sourceSegments: Segments, tanks: Tank[], diver: Diver, options: Options): number {
        const testSegments = this.createTestProfile(sourceSegments);
        const addedSegment = testSegments.last();
        const limits = this.findRightUpperInterval(testSegments, addedSegment, tanks, diver, options);
        const addedDuration = this.findMaximalAddedDuration(testSegments, addedSegment, tanks, diver, options, limits);

        // the estimated max. duration is shorter, than user defined segments
        if(addedDuration === 0) {
            return 0;
        }

        // Round down to minutes directly to ensure we are in range of enough value
        const totalDuration = Time.toMinutes(sourceSegments.duration + addedDuration);
        return Math.floor(totalDuration);
    }

    private findRightUpperInterval(testSegments: Segments, addedSegment: Segment,
        tanks: Tank[], diver: Diver, options: Options): Interval {

        // Choosing this as estimated typical middle length of the dive
        const stepDuration = Time.oneMinute * 40;
        this.consumeFromProfile(testSegments, tanks, diver, options);

        while (Tanks.haveReserve(tanks)) {
            addedSegment.duration += stepDuration;
            // This is performance hit, we dont know the no decompression profile, so we need to create always new one.
            // and initial profile, can be already decompression.
            this.consumeFromProfile(testSegments, tanks, diver, options);
        }

        let leftLimit = addedSegment.duration - stepDuration;
        leftLimit = leftLimit < 0 ? 0 : leftLimit;

        return {
            left: leftLimit,
            right:  addedSegment.duration
        };
    }

    /** binary search to reduce the interval up to one minute */
    private findMaximalAddedDuration(testSegments: Segments, addedSegment: Segment,  tanks: Tank[],
        diver: Diver, options: Options, limits: Interval): number {

        // 1 second precision - because we later add additional user defined seconds to prevent rounding issues
        while (limits.right - limits.left > Time.oneSecond) {
            const middle = limits.left + (limits.right - limits.left) / 2;
            addedSegment.duration = middle;
            this.consumeFromProfile(testSegments, tanks, diver, options);

            if(Tanks.haveReserve(tanks)) {
                limits.left = middle;
            } else {
                limits.right = middle;
            }
        }

        return limits.left;
    }

    private consumeFromProfile(testSegments: Segments, tanks: Tank[], diver: Diver, options: Options){
        const profile = Consumption.calculateDecompression(testSegments, tanks, options);
        this.consumeFromTanks(profile.segments, testSegments.length, tanks, diver);
    }

    private createTestProfile(sourceSegments: Segments): Segments {
        const testSegments = sourceSegments.copy();
        const lastUserSegment = sourceSegments.last();
        testSegments.addFlat(lastUserSegment.endDepth, lastUserSegment.gas, 0);
        return testSegments;
    }

    private updateReserve(ascent: Segment[], tanks: Tank[], stressSac: number): void {
        const segments = ascent.slice();
        this.addSolvingSegment(segments);

        // here the consumed during emergency ascent means reserve
        // take all segments, because we expect all segments are not user defined => don't have tank assigned
        const gasesConsumed: Map<number, number> = this.toBeConsumed(segments, stressSac, (s) => true);

        // add the reserve from opposite order than consumed gas
        for (let index = 0; index <= tanks.length - 1; index++) {
            const tank = tanks[index];
            const gasCode = tank.gas.contentCode();
            let consumedLiters = gasesConsumed.get(gasCode) || 0;
            consumedLiters = this.addReserveToTank(tank, consumedLiters);
            gasesConsumed.set(gasCode, consumedLiters);
        }

        // Add minimum reserve to first tank only as back gas? This doesn't look nice for side mount.
        if (tanks[0].reserve < Consumption.minimumRockBottom) {
            tanks[0].reserve = Consumption.minimumRockBottom;
        }
    }

    private addReserveToTank(tank: Tank, consumedLiters: number): number {
        const consumedBars = Math.ceil(consumedLiters / tank.size);
        const tankConsumedBars = (consumedBars + tank.reserve) > tank.startPressure ? tank.startPressure - tank.reserve : consumedBars;
        tank.reserve += tankConsumedBars;
        return this.extractRemaining(consumedLiters, tankConsumedBars, tank.size);
    }

    // in case of user defined gas switch without stay at depth (in ascent segment), we prolong the duration at depth
    private addSolvingSegment(ascent: Segment[]): void {
        // all segments are user defined
        if (ascent.length === 0) {
            return;
        }

        const solvingDuration = 2 * Time.oneMinute;
        const ascentDepth = ascent[0].startDepth;
        const problemSolving = new Segment(ascentDepth, ascentDepth, ascent[0].gas, solvingDuration);
        ascent.unshift(problemSolving);
    }

    private consumeByGases(segments: Segment[], tanks: Tank[], sac: number, remainToConsume: Map<number, number>): void {
        // assigned tank will be consumed from that tank directly
        // it is always user defined segment (also in ascent)
        const gasesConsumed: Map<number, number> = this.toBeConsumedYet(segments, sac, remainToConsume, (s) => !s.tank);

        // distribute the consumed liters across all tanks with that gas starting from last one
        // to consumed stages first. This simulates one of the back mounted system procedures.
        for (let index = tanks.length - 1; index >= 0; index--) {
            const tank = tanks[index];
            const gasCode = tank.gas.contentCode();
            let consumedLiters = gasesConsumed.get(gasCode) || 0;
            consumedLiters = this.consumeFromTank(tank, consumedLiters);
            gasesConsumed.set(gasCode, consumedLiters);
        }
    }

    private consumeByTanks(segments: Segment[], sac: number): Map<number, number> {
        const remainToConsume: Map<number, number> = new Map<number, number>();
        const sacSeconds = Time.toMinutes(sac);

        segments.forEach((segment: Segment) => {
            if (segment.tank) {
                const tank = segment.tank;
                const gasCode = segment.gas.contentCode();
                const consumptionSegment = ConsumptionSegment.fromSegment(segment);
                const consumedLiters = this.consumedBySegment(consumptionSegment, sacSeconds);
                const remainingLiters = this.consumeFromTank(tank, consumedLiters);
                let consumedByGas: number = remainToConsume.get(gasCode) || 0;
                consumedByGas += remainingLiters;
                remainToConsume.set(gasCode, consumedByGas);
            }
        });

        return remainToConsume;
    }

    private consumeFromTank(tank: Tank, consumedLiters: number): number {
        const consumedBars = Math.ceil(consumedLiters / tank.size);
        const tankConsumedBars = consumedBars > tank.endPressure ? tank.endPressure : consumedBars;
        tank.consumed += tankConsumedBars;
        return this.extractRemaining(consumedLiters, tankConsumedBars, tank.size);
    }

    private extractRemaining(consumedLiters: number, tankConsumedBars: number, tankSize: number): number {
        consumedLiters = consumedLiters - (tankConsumedBars * tankSize);
        // because of previous rounding up the consumed bars
        consumedLiters = consumedLiters < 0 ? 0 : consumedLiters;
        return consumedLiters;
    }

    private toBeConsumed(segments: Segment[], sac: number, includeSegment: (segment: Segment) => boolean): Map<number, number> {
        const emptyConsumptions = new Map<number, number>();
        return this.toBeConsumedYet(segments, sac, emptyConsumptions, includeSegment);
    }

    private toBeConsumedYet(segments: Segment[], sac: number,
        remainToConsume: Map<number, number>,
        includeSegment: (segment: Segment) => boolean): Map<number, number> {

        const sacSeconds = Time.toMinutes(sac);

        for (let index = 0; index < segments.length; index++) {
            const segment = segments[index];

            if (includeSegment(segment)) {
                const gas = segment.gas;
                const gasCode = gas.contentCode();
                const converted = ConsumptionSegment.fromSegment(segment);
                const consumedLiters = this.consumedBySegment(converted, sacSeconds);
                let consumedByGas: number = remainToConsume.get(gasCode) || 0;
                consumedByGas += consumedLiters;
                remainToConsume.set(gasCode, consumedByGas);
            }
        }

        return remainToConsume;
    }

    /**
     * Returns consumption in Liters at given segment average depth
     * @param sacSeconds Liter/second
     */
    private consumedBySegment(segment: ConsumptionSegment, sacSeconds: number) {
        const averagePressure = this.depthConverter.toBar(segment.averageDepth);
        const consumed = segment.duration * averagePressure * sacSeconds;
        return consumed;
    }
}

