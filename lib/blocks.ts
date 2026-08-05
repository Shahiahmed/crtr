export const TEAM_BLOCKS = [
  "Соцобеспечение",
  "Аналитический блок",
  "IT сопровождение",
  "Трудовые отношения и занятость",
  "Корпоративный блок",
] as const;

export type TeamBlock = (typeof TEAM_BLOCKS)[number];

export function isValidTeamBlock(blockName: string): blockName is TeamBlock {
  return (TEAM_BLOCKS as readonly string[]).includes(blockName);
}
