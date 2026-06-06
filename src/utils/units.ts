// Unit conversion utilities — read from user's localStorage preferences.
// All stored data is always in km / kg CO₂. These helpers convert for display only.

export const KM_TO_MI   = 0.621371;
export const KG_TO_LBS  = 2.20462;
export const MI_TO_KM   = 1 / KM_TO_MI;

export type DistanceUnit = "km" | "mi";
export type WeightUnit   = "kg" | "lbs";

export function getDistanceUnit(): DistanceUnit {
  return (localStorage.getItem("ecoisland-distance-unit") as DistanceUnit) || "km";
}

export function getWeightUnit(): WeightUnit {
  return (localStorage.getItem("ecoisland-weight-unit") as WeightUnit) || "kg";
}

/** km  → display unit */
export function toDisplayDist(km: number, unit: DistanceUnit = getDistanceUnit()): number {
  return unit === "mi" ? km * KM_TO_MI : km;
}

/** user-entered value in display unit → km for storage / emission factor math */
export function toStorageDist(val: number, unit: DistanceUnit = getDistanceUnit()): number {
  return unit === "mi" ? val * MI_TO_KM : val;
}

/** kg CO₂ → display unit */
export function toDisplayWt(kg: number, unit: WeightUnit = getWeightUnit()): number {
  return unit === "lbs" ? kg * KG_TO_LBS : kg;
}
