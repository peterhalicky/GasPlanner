import { Ceiling, Time, Event, Segment, StandardGases } from 'scuba-physics';

export enum Strategies {
    ALL = 1,
    HALF = 2,
    THIRD = 3
}

export class Plan {
    public noDecoTime: number;

    constructor(public duration: number, public depth: number, public strategy: Strategies) {
    }

    public get availablePressureRatio(): number {
        return this.strategy === Strategies.THIRD ? 2 / 3 : 1;
    }

    public get needsReturn(): boolean {
        return this.strategy !== Strategies.ALL;
    }

    public get noDecoExceeded(): boolean {
        return this.duration > this.noDecoTime;
    }

    public loadFrom(other: Plan): void {
        this.depth = other.depth;
        this.duration = other.duration;
        this.strategy = other.strategy;
    }
}

export class Dive {
    public calculated = false;
    public maxTime = 0;
    public timeToSurface = 0;
    public turnPressure = 0;
    public turnTime = 0;
    public needsReturn = false;
    public notEnoughGas = false;
    public depthExceeded = false;
    public notEnoughTime = false;
    public noDecoExceeded = false;
    public wayPoints: WayPoint[] = [];
    public ceilings: Ceiling[];
    public events: Event[];

    public get totalDuration(): number {
        if (this.wayPoints.length === 0) {
            return 0;
        }

        return this.wayPoints[this.wayPoints.length - 1].endTime;
    }

    public get maxDepth(): number {
        const bottom = this.wayPoints[1]; // for single level dives second is always depth
        return bottom.startDepth;
    }

    // expecting single level dive
    public get descent(): WayPoint {
        return this.wayPoints[0];
    }

    public get hasErrors(): boolean {
        // the only errors preventing draw chart
        return this.calculated && this.notEnoughTime;
    }

    public get hasHoursRuntime(): boolean {
       const duration = Time.toDate(this.totalDuration);
       const hasHours = duration.getHours() > 0;
       return hasHours;
    }
}

export enum SwimAction {
    hover = 0,
    ascent = 1,
    descent = 2,
    switch = 3
}

export class WayPoint {
    /** in seconds */
    public startTime = 0;
    /** in seconds */
    public endTime = 0;
    /** in meters */
    private _startDepth = 0;
    /** in meters */
    private _endDepth = 0;

    public selected = false;

    private action: SwimAction;

    // TODO fix unassgined gas name
    private _gasName: string;

    public get gasName(): string {
      return this._gasName;
    }

    /**
     * @param duration in seconds
     * @param newDepth in meters
     * @param previousDepth in meters
     */
    constructor(public duration: number, newDepth: number, previousDepth: number = 0) {
        this.endTime = Math.round(duration * 100) / 100;
        this._endDepth = newDepth;
        this._startDepth = previousDepth;
        this.updateAction();
    }

    private updateAction(): void {
        this.action = SwimAction.hover;

        if (this.startDepth < this.endDepth) {
            this.action = SwimAction.descent;
        }

        if (this.startDepth > this.endDepth) {
            this.action = SwimAction.ascent;
        }
    }

    public asGasSwitch(): void {
        this.action = SwimAction.switch;
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

    public get swimAction(): SwimAction {
        return this.action;
    }

    public get label(): string {
        if (this.startDepth !== this.endDepth) {
            return '';
        }

        const depth = this.endDepth + ' m';
        const durationText = Math.round(this.duration) + ' min.';
        return depth + ',' + durationText;
    }

    public toLevel(segment: Segment): WayPoint {
        const result = WayPoint.fromSegment(segment);
        result.startTime = this.endTime;
        const end = this.endTime + segment.duration;
        result.endTime = Math.round(end * 100) / 100;
        result._startDepth = this.endDepth;
        result.updateAction();
        return result;
    }

    public static fromSegment(segment: Segment): WayPoint {
        let newWayPoint = new WayPoint(segment.duration, segment.endDepth);
        const gasName = StandardGases.nameFor(segment.gas.fO2, segment.gas.fHe);
        newWayPoint._gasName = gasName;
        return newWayPoint;
    }

    public fits(timeStamp: number): boolean {
        return this.startTime <= timeStamp && timeStamp < this.endTime;
    }
}
