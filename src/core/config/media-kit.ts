// Media-kit template list (CHASSIS_SPEC §4: config-driven, adding a template
// is a config edit + component, never a migration). v1 ships one template.

export const MEDIA_KIT_TEMPLATES = ["classic"] as const;

export type MediaKitTemplate = (typeof MEDIA_KIT_TEMPLATES)[number];

export const MEDIA_KIT_TEMPLATE_LABELS: Record<MediaKitTemplate, string> = {
  classic: "Classic",
};

export const DEFAULT_MEDIA_KIT_TEMPLATE: MediaKitTemplate = "classic";

// Default accent used until the creator picks one.
export const DEFAULT_ACCENT_COLOR = "#7c3aed";
