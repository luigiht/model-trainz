/** Maps each Depot train set to its locomotive and coach builders. */
import type { TrainSetId } from "@/game/content/trainSets";
import { buildCarriage, buildLocomotive, type VehicleModel } from "./trainModels";
import { buildEvergreenCoach, buildEvergreenLoco } from "./evergreenDiesel";

interface TrainSetBuilders {
  loco: () => VehicleModel;
  coach: (index: number) => VehicleModel;
}

export const TRAIN_SET_MODELS: Record<TrainSetId, TrainSetBuilders> = {
  heritage: { loco: buildLocomotive, coach: buildCarriage },
  evergreen: { loco: buildEvergreenLoco, coach: buildEvergreenCoach },
};
