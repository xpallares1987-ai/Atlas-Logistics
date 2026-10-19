/**
 * @file iata-one-record.service.ts
 * @description Orchestration service for IATA ONE Record & Air Cargo e-AWB Linked Data Hub.
 */

import {
  OneRecordWaybill,
  CargoIqMilestone,
  DangerousGoodsItem,
  EDgdValidationResult,
  CargoIqMilestoneCode,
  SEED_ONE_RECORD_WAYBILLS,
  SEED_CARGO_IQ_TIMELINE,
  validateDangerousGoodsDeclaration,
  evaluateMilestoneSla
} from '@atlas/shared';

export class IataOneRecordService {
  private waybills: OneRecordWaybill[] = JSON.parse(JSON.stringify(SEED_ONE_RECORD_WAYBILLS));
  private milestones: Map<string, CargoIqMilestone[]> = new Map();

  constructor() {
    // Seed initial milestones for the BCN-JFK AWB
    this.milestones.set('075-82910482', JSON.parse(JSON.stringify(SEED_CARGO_IQ_TIMELINE)));
  }

  public getWaybills(): OneRecordWaybill[] {
    return this.waybills;
  }

  public getWaybill(waybillId: string): OneRecordWaybill | undefined {
    return this.waybills.find(
      (w) => w.waybillId === waybillId || w.fullAwbNumber === waybillId
    );
  }

  public getMilestones(awbNumber: string): CargoIqMilestone[] {
    const list = this.milestones.get(awbNumber) || SEED_CARGO_IQ_TIMELINE;
    return list.map((m) => evaluateMilestoneSla(m));
  }

  public recordMilestoneEvent(
    awbNumber: string,
    milestoneCode: CargoIqMilestoneCode,
    eventRemarks?: string
  ): { success: boolean; updatedMilestone?: CargoIqMilestone; message: string } {
    let list = this.milestones.get(awbNumber);
    if (!list) {
      list = JSON.parse(JSON.stringify(SEED_CARGO_IQ_TIMELINE));
      this.milestones.set(awbNumber, list);
    }

    const milestone = list.find((m) => m.milestoneCode === milestoneCode);
    if (!milestone) {
      return { success: false, message: `Hito ${milestoneCode} no encontrado para e-AWB ${awbNumber}.` };
    }

    milestone.actualTimestamp = new Date().toISOString();
    if (eventRemarks) milestone.eventRemarks = eventRemarks;

    const evaluated = evaluateMilestoneSla(milestone);
    return {
      success: true,
      updatedMilestone: evaluated,
      message: `Hito Cargo iQ ${milestoneCode} registrado con éxito.`
    };
  }

  public validateDangerousGoods(item: DangerousGoodsItem): EDgdValidationResult {
    return validateDangerousGoodsDeclaration(item);
  }
}
