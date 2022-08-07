import { Component, Input } from '@angular/core';
import { Salinity } from 'scuba-physics';

@Component({
    selector: 'app-salinity',
    templateUrl: './salinity.component.html',
    styleUrls: ['./salinity.component.css']
})
export class SalinityComponent {
    @Input()
    public salinity: Salinity = Salinity.fresh;

    public readonly freshName = 'Fresh';
    public readonly brackishName = 'Brackish (EN13319)';
    public readonly saltName = 'Salt';

    public get salinityOption(): string {
        switch (this.salinity) {
            case Salinity.salt:
                return this.saltName;
            case Salinity.brackish:
                return this.brackishName;
            default:
                return this.freshName;
        }
    }

    public useFresh(): void {
        this.salinity = Salinity.fresh;
    }

    public useBrackish(): void {
        this.salinity = Salinity.brackish;
    }

    public useSalt(): void {
        this.salinity = Salinity.salt;
    }
}