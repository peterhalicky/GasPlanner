import { DepthLevels } from './DepthLevels';
import { SafetyStop } from './Options';

describe('Depth Levels', () => {
    describe('Next stop', () => {
        const irrelevantSafety = SafetyStop.always;

        it('Rounds to 3 meter increments', () => {
            const levels = new DepthLevels(3, irrelevantSafety);
            const result = levels.nextStop(17.6);
            expect(result).toBe(15);
        });

        it('At 12 m returns first stop at 9 meters', () => {
            const levels = new DepthLevels(3, irrelevantSafety);
            const result = levels.nextStop(12);
            expect(result).toBe(9);
        });

        it('At 12 m returns next stop at 9 meters', () => {
            const levels = new DepthLevels(3, irrelevantSafety);
            const result = levels.nextStop(9);
            expect(result).toBe(6);
        });

        it('Returns 0 m bellow 3 m last stop', () => {
            const levels = new DepthLevels(6, irrelevantSafety);
            const result = levels.nextStop(5);
            expect(result).toBe(0);
        });

        it('Is 5 m from 6 m in case last stop 5 m', () => {
            const levels = new DepthLevels(5, irrelevantSafety);
            const result = levels.nextStop(6);
            expect(result).toBe(5);
        });

        it('Is 0 meters at 6 meters in case last stop 6 m', () => {
            const levels = new DepthLevels(6, irrelevantSafety);
            const result = levels.nextStop(6);
            expect(result).toBe(0);
        });
    });

    describe('Add safety stop', () => {
        describe('Always', () => {
            const levels = new DepthLevels(5, SafetyStop.always);
            it('Deep dive below last stop', () => {
                const result = levels.addSafetyStop(7, 40);
                expect(result).toBeFalsy();
            });

            it('Deep dive at stop', () => {
                const result = levels.addSafetyStop(5, 40);
                expect(result).toBeTruthy();
            });

            it('Below last stop', () => {
                const result = levels.addSafetyStop(7, 7);
                expect(result).toBeFalsy();
            });

            it('At last stop', () => {
                const result = levels.addSafetyStop(5, 5);
                expect(result).toBeTruthy();
            });
        });

        describe('Auto', () => {
            const levels = new DepthLevels(5, SafetyStop.auto);
            it('Deep dive below stop', () => {
                const result = levels.addSafetyStop(10, 40);
                expect(result).toBeFalsy();
            });

            it('Deep dive, at stop', () => {
                const result = levels.addSafetyStop(5, 40);
                expect(result).toBeTruthy();
            });

            it('Below stop', () => {
                const result = levels.addSafetyStop(10, 10);
                expect(result).toBeFalsy();
            });

            it('At the stop', () => {
                const result = levels.addSafetyStop(5, 10);
                expect(result).toBeFalsy();
            });
        });

        describe('Never', () => {
            const levels = new DepthLevels(5, SafetyStop.never);
            it('Deep dive, below stop', () => {
                const result = levels.addSafetyStop(7, 40);
                expect(result).toBeFalsy();
            });

            it('Deep dive at 5 m stop', () => {
                const result = levels.addSafetyStop(5, 40);
                expect(result).toBeFalsy();
            });

            it('Below', () => {
                const result = levels.addSafetyStop(7, 7);
                expect(result).toBeFalsy();
            });

            it('At 5 m stop', () => {
                const result = levels.addSafetyStop(5, 5);
                expect(result).toBeFalsy();
            });
        });
    });
});