export type TournamentFormatId =
  | "groups_bo1"
  | "groups_playoff_bo3"
  | "round_robin"
  | "full_bo3";

export type FormatPreviewKind = "groups_playoff" | "round_robin";

export type SeriesLabel = "BO1" | "BO3" | "—";

export type TournamentFormatOption = {
  id: TournamentFormatId;
  title: string;
  shortLabel: string;
  teaser: string;
  summary: string;
  matchCountLabel: string;
  durationLabel: string;
  groupSeries: SeriesLabel;
  playoffSeries: SeriesLabel;
  previewKind: FormatPreviewKind;
  highlights: string[];
};

export type FormatGlossaryItem = {
  term: string;
  meaning: string;
};

/** Plain-language explanations for people who do not play esports. */
export const FORMAT_GLOSSARY: FormatGlossaryItem[] = [
  {
    term: "BO1 (Best of 1)",
    meaning:
      "Играется одна карта. Кто выиграл эту карту — тот выиграл весь матч. Быстро: обычно 30–50 минут.",
  },
  {
    term: "BO3 (Best of 3)",
    meaning:
      "Серия до двух побед, максимум три карты. Счёт может быть 2:0 или 2:1. Дольше и «честнее» для важного матча: обычно 1,5–3 часа.",
  },
  {
    term: "Карта",
    meaning:
      "Игровая локация в CS2 (например, Mirage, Inferno). Один матч = одна или несколько карт подряд.",
  },
  {
    term: "Veto (вето карт)",
    meaning:
      "Перед серией команды по очереди вычёркивают карты из списка и оставляют те, на которых будут играть. Так никто не играет только на «своей» любимой карте без выбора.",
  },
  {
    term: "Группа",
    meaning:
      "Несколько команд играют между собой в мини-таблице. Кто занял 1–2 место — проходит дальше.",
  },
  {
    term: "Круговая",
    meaning:
      "В группе (или во всём турнире) каждая команда играет с каждой. Побеждает та, у кого больше побед.",
  },
  {
    term: "Плей-офф",
    meaning:
      "Решающая часть после групп: проиграл — выбыл (кроме матча за 3 место). Обычно полуфинал → финал.",
  },
  {
    term: "Полуфинал",
    meaning: "Матч за выход в финал. Два полуфинала → два финалиста.",
  },
  {
    term: "Финал",
    meaning: "Матч за 1 место (чемпион турнира).",
  },
  {
    term: "Матч за 3 место",
    meaning: "Играют проигравшие полуфиналы — определяют бронзового призёра.",
  },
  {
    term: "Жеребьёвка",
    meaning:
      "Случайное распределение команд по группам и сетке. Запускает админ, когда все готовы.",
  },
];

export const TOURNAMENT_FORMATS: TournamentFormatOption[] = [
  {
    id: "groups_bo1",
    title: "Классика — короткие матчи",
    shortLabel: "A · коротко",
    teaser: "Группы и плей-офф по одной карте. Самый быстрый день.",
    summary:
      "Две группы по 3 команды. В группе каждая играет с каждой — одна карта на матч. Две лучшие из группы идут дальше: полуфинал, финал и матч за 3 место. Все игры — тоже по одной карте. Самый быстрый день.",
    matchCountLabel: "~10 матчей",
    durationLabel: "≈ 4–5 часов",
    groupSeries: "BO1",
    playoffSeries: "BO1",
    previewKind: "groups_playoff",
    highlights: [
      "Всё по одной карте — день короткий",
      "Формат уже как на сайте (группы → плей-офф)",
      "Две команды заканчивают турнир после группового этапа",
    ],
  },
  {
    id: "groups_playoff_bo3",
    title: "Группы быстро · плей-офф длиннее",
    shortLabel: "B · баланс",
    teaser: "Группы по одной карте, финальные стадии — до двух побед.",
    summary:
      "В группах — по одной карте (быстро). В полуфинале и финале — серия до двух побед (до трёх карт), с выбором карт перед игрой. Матч за 3 место можно оставить коротко (одна карта). Хороший баланс: не затянутые группы, но решающие матчи интереснее.",
    matchCountLabel: "~10 матчей / серий",
    durationLabel: "≈ 6–8 часов",
    groupSeries: "BO1",
    playoffSeries: "BO3",
    previewKind: "groups_playoff",
    highlights: [
      "Группы не утомляют, финал — как на «настоящем» турнире",
      "Перед длинной серией команды выбирают карты (вето)",
      "Удобно играть на двух серверах параллельно",
    ],
  },
  {
    id: "round_robin",
    title: "Каждый играет с каждым",
    shortLabel: "C · много игр",
    teaser: "Все 6 команд играют между собой. Больше матчей для всех.",
    summary:
      "Все 6 команд играют друг с другом по одной карте (15 матчей). Никто не вылетает сразу после двух поражений в группе. Потом можно разыграть финал между двумя лучшими — серией до двух побед. Больше игр для всех.",
    matchCountLabel: "15 матчей (+ финал)",
    durationLabel: "≈ 6–8 часов",
    groupSeries: "BO1",
    playoffSeries: "BO3",
    previewKind: "round_robin",
    highlights: [
      "Максимум матчей — меньше «приехали и сразу вылетели»",
      "Итог по таблице побед",
      "Сетку «каждый с каждым» на сайте пока ведём отдельно от текущей жеребьёвки",
    ],
  },
  {
    id: "full_bo3",
    title: "Длинный турнирный день",
    shortLabel: "D · долго",
    teaser: "Группы коротко, все решающие матчи — длинные серии.",
    summary:
      "Группы — по одной карте. А полуфиналы, финал и матч за 3 место — все сериями до двух побед (до трёх карт). Самый «спортивный» и самый длинный вариант: нужен почти весь день.",
    matchCountLabel: "~10 матчей / серий",
    durationLabel: "≈ 7–9 часов",
    groupSeries: "BO1",
    playoffSeries: "BO3",
    previewKind: "groups_playoff",
    highlights: [
      "Все решающие стадии — длинные серии",
      "Нужен запас времени до вечера",
      "Лучше с двумя серверами сразу",
    ],
  },
];

export function getSeriesPlainLabel(seriesLabel: SeriesLabel): string {
  if (seriesLabel === "BO1") {
    return "1 карта";
  }

  if (seriesLabel === "BO3") {
    return "до 2 побед";
  }

  return "—";
}

export function getFormatById(
  formatId: string,
): TournamentFormatOption | undefined {
  return TOURNAMENT_FORMATS.find((format) => format.id === formatId);
}

export function isTournamentFormatId(
  value: string,
): value is TournamentFormatId {
  return TOURNAMENT_FORMATS.some((format) => format.id === value);
}
