import { DepthConverter } from './depth-converter';
import { GasMixtures } from './Gases';

export class NitroxCalculator {
  constructor(private depthConverter: DepthConverter) {
  }

  /**
   * Calculates best mix of nitrox gas for given depth.
   *
   * @param pO2 - Partial pressure constant.
   * @param depth - Current depth in meters.
   * @returns Percents of oxygen fraction in required gas.
   */
  public bestMix(pO2: number, depth: number): number {
    const result = GasMixtures.bestMix(pO2, depth, this.depthConverter) * 100 ;
    return Math.floor(result * 100) / 100;
  }

  /**
   * Calculates equivalent air depth for given nitrox gas mix.
   *
   * @param percentO2 - Percents of Oxygen fraction in gas.
   * @param depth - Current depth in meters.
   * @returns Depth in meters.
   */
  public static ead(percentO2: number, depth: number): number {
    const fO2  = percentO2 / 100;
    const result = GasMixtures.ead(fO2, depth);
    return Math.ceil(result * 100) / 100;
  }

  /**
   * Calculates Maximum operation depth for given mix.
   *
   * @param ppO2 - Partial pressure constant.
   * @param percentO2 - Percents of Oxygen fraction in gas.
   * @returns Depth in meters.
   */
  public mod(ppO2: number, percentO2: number): number {
    const fO2 = percentO2 / 100;
    let result = GasMixtures.mod(ppO2, fO2);
    result = this.depthConverter.fromBar(result);
    return Math.floor(result * 100) / 100;
  }

  /**
   * Calculates recommended switch depth for given gas rounded to meters.
   *
   * @param ppO2 - Partial pressure constant.
   * @param percentO2 - Percents of Oxygen fraction in gas.
   * @returns Depth in meters.
   */
  public gasSwitch(ppO2: number, percentO2: number): number {
    const fO2 = percentO2 / 100;
    let result = GasMixtures.mod(ppO2, fO2);
    return this.depthConverter.toDecoStop(result);
  }

  /**
   * Calculates partial pressure constant for given mix at depth.
   *
   * @param fO2 - Percents of Oxygen fraction in gas.
   * @param depth - Current depth in meters.
   * @returns Constant value.
   */
  public partialPressure(fO2: number, depth: number): number {
    const bar = this.depthConverter.toBar(depth);
    const result = GasMixtures.partialPressure(bar, fO2) / 100;
    return Math.ceil(result * 100) / 100;
  }
}
