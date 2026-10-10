import { SKJ_PROFILE } from "./skj";

export * from "./types";
export { SKJ_PACKAGE_VERSION, SKJ_PROFILE, buildSkjPackage, humanRequiredPaths, type SkjPackage } from "./skj";

/** De beschikbare accreditatieprofielen. Een nieuw register = een nieuw profiel hier; de leerlijn blijft gelijk. */
export const ACCREDITATION_PROFILES = { skj: SKJ_PROFILE } as const;
export type AccreditationProfileId = keyof typeof ACCREDITATION_PROFILES;
