import {
    Segments, Gases, BuhlmannAlgorithm, ProfileEvents, DepthConverterFactory, Consumption, Time
} from 'scuba-physics';
import {
    ProfileRequestDto, ProfileResultDto, DtoSerialization, ConsumptionRequestDto, ConsumptionResultDto
} from '../shared/serialization.model';

export class PlanningTasks {
    public static calculateDecompression(data: ProfileRequestDto): ProfileResultDto {
        const tanks = DtoSerialization.toTanks(data.tanks);
        const segments = DtoSerialization.toSegments(data.plan, tanks);
        const plan = Segments.fromCollection(segments);
        const gases = Gases.fromTanks(tanks);
        const algorithm = new BuhlmannAlgorithm();
        const profile = algorithm.calculateDecompression(data.options, gases, plan);
        const profileDto = DtoSerialization.fromProfile(profile);
        const events = ProfileEvents.fromProfile(plan.startAscentIndex, segments, profile.ceilings, data.options);
        // TODO fix errors usage present in WaypointService
        return {
            profile: profileDto,
            events
        };
    }

    public static noDecoTime(task: ProfileRequestDto): number {
        // we can't speedup the prediction from already obtained profile,
        // since it may happen, the deco starts during ascent.
        // we cant use the maxDepth, because its purpose is only for single level dives
        const tanks = DtoSerialization.toTanks(task.tanks);
        const gases = Gases.fromTanks(tanks);
        const originProfile = DtoSerialization.toSegments(task.plan, tanks);
        const segments = Segments.fromCollection(originProfile);
        const algorithm = new BuhlmannAlgorithm();
        const noDecoLimit = algorithm.noDecoLimitMultiLevel(segments, gases, task.options);
        return noDecoLimit;
    }

    public static calculateConsumption(task: ConsumptionRequestDto): ConsumptionResultDto {
        const depthConverter = new DepthConverterFactory(task.options).create();
        const consumption = new Consumption(depthConverter);

        // deserialize
        const tanks = DtoSerialization.toTanks(task.tanks);
        const originProfile = DtoSerialization.toSegments(task.profile, tanks);
        const segments = DtoSerialization.toSegments(task.plan, tanks);
        const plan = Segments.fromCollection(segments);

        // Max bottom changes tank consumed bars, so we need it calculate before real profile consumption
        const maxTime = consumption.calculateMaxBottomTime(plan, tanks, task.diver, task.options);
        const emergencyAscent = consumption.emergencyAscent(originProfile, task.options, tanks);
        let timeToSurface = Segments.duration(emergencyAscent);
        timeToSurface = Time.toMinutes(timeToSurface);
        consumption.consumeFromTanks2(originProfile, emergencyAscent, task.options, tanks, task.diver);
        return {
            maxTime,
            timeToSurface,
            tanks: DtoSerialization.fromTanks(tanks),
        };
    }
}
