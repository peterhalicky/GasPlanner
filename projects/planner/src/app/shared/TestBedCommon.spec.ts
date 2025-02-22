import { TestBed } from '@angular/core/testing';
import { DepthsService } from './depths.service';

export class TestBedExtensions {
    /** Enforces to create the DepthsService instance, which sets the plan */
    public static initPlan() {
        TestBed.inject(DepthsService);
    }
}
