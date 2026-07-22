import type { DevPreviewArtworkReferenceCrop, DevPreviewSampleCardSource } from "./devPreviewState";
import type { CardKind, CardSpec } from "./types";
import { DEFAULT_CARD_APPEARANCE } from "./cardModel";
import { CARD_KINDS, SETS } from "./presets";
import type { Language } from "./i18n";

const PUBLIC_REFERENCE_ROOT = `${import.meta.env.BASE_URL}reference-pack/v1`;
const SAMPLE_ROOT = `${PUBLIC_REFERENCE_ROOT}/samples`;
const REFERENCE_ROOT = `${PUBLIC_REFERENCE_ROOT}/references/cards`;
const HQ_REFERENCE_ROOT = `${PUBLIC_REFERENCE_ROOT}/references/hq`;

export const DEV_PREVIEW_ASSET_PACK_URL =
  `${PUBLIC_REFERENCE_ROOT}/kards-asset-pack.json`;

export type DevPreviewSample = {
  id: string;
  label: string;
  labelZh?: string;
  kind: CardKind;
  nation: string;
  rarity: string;
  set: string;
  referenceUrl: string;
  referenceUrls?: Partial<Record<Language, string>>;
  artworkReferenceCrop?: DevPreviewArtworkReferenceCrop;
} & DevPreviewSampleCardSource;

export const DEV_PREVIEW_HQ_SAMPLES: DevPreviewSample[] = [
  hqSample("washington_hq", "WASHINGTON", "华盛顿", "us", "Washington.png", "Washington, D.C. played an important role in the United States' planning and preparation for World War II.", "华盛顿特区在美国规划和准备二战的过程中发挥了重要作用。"),
  hqSample("london_hq", "LONDON", "伦敦", "britain", "London.png", "Capital of the British Empire and the wartime administrative center of Britain and the Allies in Europe.", "大英帝国的首都，也是英国和盟国在欧洲的战时行政中心。"),
  hqSample("moscow_hq", "MOSCOW", "莫斯科", "soviet", "Moscow.png", "Moscow is the capital of the Soviet Union.", "莫斯科是苏联的首都。"),
  hqSample("truk_hq", "TRUK", "特鲁克", "japan", "Truk.png", "Truk Atoll was Japan's primary naval base in the South Pacific during World War II.", "特鲁克环礁是二战期间日本在南太平洋的主要海军基地。"),
  hqSample("danzig_hq", "DANZIG", "但泽", "germany", "Danzig.png", "Danzig was occupied by German forces at the beginning of the war.", "战争开始时被德军占领的但泽。"),
];

export const DEV_PREVIEW_HQ_SAMPLE: DevPreviewSample = DEV_PREVIEW_HQ_SAMPLES[0];

export const DEV_PREVIEW_REFERENCE_SAMPLES: DevPreviewSample[] = [
  cardSample("24th_uan", "blood-and-iron", "infantry", "24th UŁAN", "第 24 乌兰骑兵团"),
  cardSample("37mm_bofors_gun", "legions", "artillery", "37mm BOFORS GUN", "博福斯 37 毫米炮"),
  cardSample("45_mm_antitank_gun", "base", "artillery", "45 mm ANTI-TANK GUN", "45 毫米反坦克炮"),
  cardSample("4e_brigade", "legions", "infantry", "4e BRIGADE", "第 4 旅"),
  cardSample("641st_rifles", "oceania-storm", "infantry", "641st RIFLES", "步兵第 641 团"),
  cardSample("6_pounder", "base", "artillery", "6 POUNDER", "6 磅炮"),
  cardSample("6th_brigade_nz_vet", "special", "infantry", "6th BRIGADE NZ", "新西兰第 6 旅"),
  cardSample("76th_napoli", "world-at-war", "infantry", "76th NAPOLI", "那不勒斯第 76 团"),
  cardSample("980_volksgrenadier", "base", "infantry", "980. VOLKSGRENADIER", "第 980 国民掷弹兵团"),
  cardSample("a26_invader", "allegiance", "bomber", "A-26 INVADER", "A-26 入侵者"),
  cardSample("b29_superfortress", "allegiance", "bomber", "B-29 SUPERFORTRESS", "B-29 超级堡垒"),
  cardSample("blackout", "base", "order", "BLACKOUT", "灯火管制"),
  cardSample("cannone_da_47", "legions", "artillery", "CANNONE DA 47", "47 毫米反坦克炮"),
  cardSample("careless_talk", "base", "countermeasure", "CARELESS TALK", "无心漫谈"),
  cardSample("cup_of_tea", "base", "order", "CUP OF TEA", "一杯茶"),
  cardSample("decisive_defense", "legions", "countermeasure", "DECISIVE DEFENSE", "关键防御"),
  cardSample("dingo", "oceania-storm", "tank", "DINGO", "丁格犬侦察车"),
  cardSample("farman_f_222", "world-at-war", "bomber", "FARMAN F.222", "法尔芒 F.222"),
  cardSample("fiat_br_20", "winter-war", "bomber", "FIAT BR.20", "菲亚特 BR.20"),
  cardSample("fokker_d_xxi", "naval-warfare", "fighter", "FOKKER D.XXI", "福克 D.XXI"),
  cardSample("french_75", "allegiance", "artillery", "FRENCH 75", "75 毫米野战炮"),
  cardSample("friendly_fire", "covert-ops", "countermeasure", "FRIENDLY FIRE", "误伤"),
  cardSample("front_formation", "blood-and-iron", "order", "FRONT FORMATION", "方面军"),
  cardSample("g4m1_betty", "base", "bomber", "G4M1 BETTY", "G4M1 一式陆攻"),
  cardSample("gordon_highlanders", "naval-warfare", "infantry", "GORDON HIGHLANDERS", "戈登高地人团"),
  cardSample("hampden_mk_i", "base", "bomber", "HAMPDEN Mk I", "汉普敦 Mk I"),
  cardSample("heroes_of_the_soviet_union", "theaters-of-war", "order", "HEROES OF THE SOVIET UNION", "苏联英雄"),
  cardSample("hold_the_line", "world-at-war", "countermeasure", "HOLD THE LINE", "坚守阵线"),
  cardSample("honor", "base", "order", "HONOR", "玉碎"),
  cardSample("hotchkiss_h35", "allegiance", "tank", "HOTCHKISS H35", "哈奇开斯 H35"),
  cardSample("humber_mk_ii", "base", "tank", "HUMBER Mk II", "亨伯 Mk II"),
  cardSample("i16_ishak", "base", "fighter", "I-16 ISHAK", "伊-16 毛驴"),
  cardSample("il2m_pl", "legions", "bomber", "IL-2M PL", "伊尔-2M PL"),
  cardSample("in_the_navy", "base", "countermeasure", "IN THE NAVY", "海军服役"),
  cardSample("interception", "base", "countermeasure", "INTERCEPTION", "拦截"),
  cardSample("jet_prototype", "winter-war", "fighter", "JET PROTOTYPE", "喷气机原型机"),
  cardSample("ju_87_b_stuka", "base", "bomber", "JU 87 B STUKA", "Ju 87 B 斯图卡"),
  cardSample("katalina", "covert-ops", "bomber", "KATALINA", "卡特琳娜"),
  cardSample("kikka", "legions", "fighter", "KIKKA", "试制橘花"),
  cardSample("l640", "allegiance", "tank", "L6/40", "L6/40"),
  cardSample("light_detachment_15", "naval-warfare", "infantry", "LIGHT DETACHMENT 15", "第 15 轻步兵支队"),
  cardSample("m2a4", "homefront", "tank", "M2A4", "M2A4"),
  cardSample("m_s_406", "allegiance", "fighter", "M.S.406", "莫拉纳-索尼耶 M.S.406"),
  cardSample("macchi_c_200", "blood-and-iron", "fighter", "MACCHI C.200", "马基 C.200"),
  cardSample("maus", "blood-and-iron", "tank", "MAUS", "鼠式坦克"),
  cardSample("mito_regiment", "base", "infantry", "MITO REGIMENT", "水户联队"),
  cardSample("model_25", "base", "tank", "MODEL 25", "维克斯装甲车"),
  cardSample("p40_warhawk", "base", "fighter", "P-40 WARHAWK", "P-40 战鹰"),
  cardSample("pak_36_fi", "winter-war", "artillery", "PAK 36 FI", "Pak 36 反坦克炮 FI"),
  cardSample("plan", "only-spawnable", "order", "PLAN", "计划"),
  cardSample("plan_d", "brothers-in-arms", "order", "PLAN D", "迪勒计划"),
  cardSample("plan_west", "legions", "order", "PLAN WEST", "西线计划"),
  cardSample("pzl_p_7", "legions", "fighter", "PZL P.7", "PZL P.7"),
  cardSample("raaf_lightning_f4", "base", "fighter", "RAAF LIGHTNING F-4", "RAAF 闪电 F-4"),
  cardSample("routed_troops", "only-spawnable", "infantry", "ROUTED TROOPS", "溃军"),
  cardSample("royal_scots", "breakthrough", "infantry", "ROYAL SCOTS", "皇家苏格兰团"),
  cardSample("salpa_line", "oceania-storm", "order", "SALPA LINE", "萨尔帕防线"),
  cardSample("sdf", "winter-war", "infantry", "SDF", "苏丹防卫军"),
  cardSample("spitfire_mk_v", "base", "fighter", "SPITFIRE Mk V", "喷火 Mk V"),
  cardSample("t19_howitzer", "base", "artillery", "T19 HOWITZER", "T19 榴弹炮"),
  cardSample("t26_fi", "winter-war", "tank", "T-26 FI", "T-26 FI"),
  cardSample("t70", "base", "tank", "T-70", "T-70"),
  cardSample("task_force_44", "oceania-storm", "order", "TASK FORCE 44", "第 44 特混舰队"),
  cardSample("the_regulars_vet", "special", "infantry", "THE REGULARS", "正规军装甲步兵团"),
  cardSample("tks", "legions", "tank", "TKS", "TKS"),
  cardSample("type_88_aa_gun", "base", "artillery", "TYPE 88 AA GUN", "八八式高射炮"),
  cardSample("usace", "base", "order", "USACE", "陆军工程兵团"),
  cardSample("vanguard", "winter-war", "order", "VANGUARD", "先峰"),
  cardSample("wespe", "theaters-of-war", "artillery", "WESPE", "黄蜂式自行火炮"),
];

const DEV_PREVIEW_ALL_SAMPLES = [...DEV_PREVIEW_REFERENCE_SAMPLES, ...DEV_PREVIEW_HQ_SAMPLES];

export type ReferenceFilters = {
  query: string;
  kind?: CardKind | "";
  nation?: string;
  rarity?: string;
  set?: string;
};

export type ReferenceSort = "match" | "name" | "set";

export function filterDevPreviewSamples(
  samples: readonly DevPreviewSample[],
  filters: ReferenceFilters,
): DevPreviewSample[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return samples.filter((sample) => {
    const searchable = `${sample.id} ${sample.label} ${sample.labelZh ?? ""}`.toLocaleLowerCase();
    return (!query || searchable.includes(query))
      && (!filters.kind || sample.kind === filters.kind)
      && (!filters.nation || sample.nation === filters.nation)
      && (!filters.rarity || sample.rarity === filters.rarity)
      && (!filters.set || sample.set === filters.set);
  });
}

export function sortDevPreviewSamples(
  samples: readonly DevPreviewSample[],
  card: CardSpec,
  sort: ReferenceSort,
  language: Language,
): DevPreviewSample[] {
  const locale = language === "zh" ? "zh-CN" : "en";
  return [...samples].sort((left, right) => {
    let result = 0;
    if (sort === "match") {
      result = compareMatchTuple(getMatchTuple(right, card), getMatchTuple(left, card));
    } else if (sort === "name") {
      result = getSampleLabel(left, language).localeCompare(getSampleLabel(right, language), locale);
    } else {
      result = getPresetIndex(SETS, left.set) - getPresetIndex(SETS, right.set)
        || getPresetIndex(CARD_KINDS, left.kind) - getPresetIndex(CARD_KINDS, right.kind);
    }
    return result || left.id.localeCompare(right.id, "en");
  });
}

export function findUniqueAutomaticArtworkSample(
  samples: readonly DevPreviewSample[],
  card: Pick<CardSpec, "kind" | "nation" | "set" | "rarity">,
): DevPreviewSample | undefined {
  const matches = samples.filter((sample) => card.kind === "hq"
    ? sample.kind === "hq" && sample.nation === card.nation
    : sample.kind === card.kind
      && sample.nation === card.nation
      && sample.set === card.set
      && sample.rarity === card.rarity);
  return matches.length === 1 ? matches[0] : undefined;
}

export function getAutomaticArtworkMatchingKey(
  card: Pick<CardSpec, "kind" | "nation" | "set" | "rarity">,
): string {
  return card.kind === "hq"
    ? `${card.kind}|${card.nation}`
    : `${card.kind}|${card.nation}|${card.set}|${card.rarity}`;
}

export const DEV_PREVIEW_SET_SAMPLES: DevPreviewSample[] = [
  getDevPreviewSampleById("t70"),
  getDevPreviewSampleById("a26_invader"),
  getDevPreviewSampleById("macchi_c_200"),
  getDevPreviewSampleById("royal_scots"),
  getDevPreviewSampleById("plan_d"),
  getDevPreviewSampleById("katalina"),
  getDevPreviewSampleById("m2a4"),
  getDevPreviewSampleById("kikka"),
  getDevPreviewSampleById("gordon_highlanders"),
  getDevPreviewSampleById("dingo"),
  getDevPreviewSampleById("routed_troops"),
  getDevPreviewSampleById("the_regulars_vet"),
  getDevPreviewSampleById("wespe"),
  getDevPreviewSampleById("jet_prototype"),
  getDevPreviewSampleById("hold_the_line"),
].filter((sample): sample is DevPreviewSample => Boolean(sample));

export function getDefaultDevPreviewSample(): DevPreviewSample {
  return getDevPreviewSampleById("t70") ?? DEV_PREVIEW_REFERENCE_SAMPLES[0];
}

export function getDevPreviewSampleById(sampleId: string): DevPreviewSample | undefined {
  return DEV_PREVIEW_ALL_SAMPLES.find((sample) => sample.id === sampleId);
}

export function getDevPreviewSampleBySet(setId: string): DevPreviewSample | undefined {
  return DEV_PREVIEW_SET_SAMPLES.find((sample) => sample.set === setId);
}

export function getDevPreviewSampleByKind(kind: CardKind): DevPreviewSample | undefined {
  return kind === "hq" ? DEV_PREVIEW_HQ_SAMPLE : undefined;
}

export function getDevPreviewSampleForCard(card: Pick<CardSpec, "kind" | "set">): DevPreviewSample | undefined {
  return getDevPreviewSampleByKind(card.kind) ?? getDevPreviewSampleBySet(card.set);
}

export function getDevPreviewReferenceForCard(
  card: Pick<CardSpec, "kind" | "set">,
  language: Language = "en",
): string | undefined {
  const sample = getDevPreviewSampleForCard(card);
  return sample ? getDevPreviewReferenceUrl(sample, language) : undefined;
}

export function getDevPreviewReferenceUrl(sample: DevPreviewSample, language: Language): string {
  return sample.referenceUrls?.[language] ?? sample.referenceUrl;
}

function cardSample(id: string, set: string, kind: CardKind, label: string, labelZh?: string): DevPreviewSample {
  const metadata = getDevPreviewSampleMetadata(id);
  if (!metadata) {
    throw new Error(`Missing reference sample metadata: ${id}`);
  }
  return {
    id,
    label,
    labelZh,
    kind,
    nation: metadata.nation,
    rarity: metadata.rarity,
    set,
    cardUrl: `${SAMPLE_ROOT}/${id}.card.json`,
    cardLocalizationUrls: {
      zh: `${SAMPLE_ROOT}/zh/${id}.card.json`,
    },
    referenceUrl: `${REFERENCE_ROOT}/${id}.png`,
    referenceUrls: {
      zh: `${REFERENCE_ROOT}/zh/${id}.avif`,
    },
  };
}

function hqSample(
  id: string,
  label: string,
  labelZh: string,
  nation: string,
  imageFile: string,
  bodyEn: string,
  bodyZh: string,
): DevPreviewSample {
  const referenceUrl = `${HQ_REFERENCE_ROOT}/en/${imageFile}`;
  const referenceUrlZh = `${HQ_REFERENCE_ROOT}/${imageFile}`;
  return {
    id,
    label,
    labelZh,
    kind: "hq",
    nation,
    rarity: "none",
    set: "base",
    referenceUrl,
    referenceUrls: {
      zh: referenceUrlZh,
    },
    artworkReferenceCrop: {
      sourceUrl: referenceUrlZh,
      sourceRect: { x: 12, y: 13, width: 476, height: 476 },
    },
    card: {
      version: 1,
      kind: "hq",
      nation,
      rarity: "standard",
      set: "base",
      title: label,
      body: bodyEn,
      keywords: [],
      keywordLine: "",
      costs: {},
      stats: {
        hqDefense: 20,
      },
      artwork: {
        source: "none",
        crop: {
          x: 0,
          y: 0,
          scale: 1,
        },
      },
      appearance: DEFAULT_CARD_APPEARANCE,
    },
    cardLocalizations: {
      zh: {
        title: labelZh,
        body: bodyZh,
        keywordLanguage: "zh",
      },
      en: {
        title: label,
        body: bodyEn,
        keywordLanguage: "en",
      },
    },
  };
}

function getSampleLabel(sample: DevPreviewSample, language: Language): string {
  return language === "zh" ? sample.labelZh ?? sample.label : sample.label;
}

function getMatchTuple(sample: DevPreviewSample, card: CardSpec): number[] {
  const normalizedTitle = card.title.trim().toLocaleLowerCase();
  return [
    normalizedTitle !== "" && [sample.label, sample.labelZh].some((label) => label?.toLocaleLowerCase() === normalizedTitle) ? 1 : 0,
    sample.kind === card.kind ? 1 : 0,
    sample.nation === card.nation ? 1 : 0,
    sample.set === card.set ? 1 : 0,
    sample.rarity === card.rarity ? 1 : 0,
  ];
}

function compareMatchTuple(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < left.length; index += 1) {
    const difference = left[index] - right[index];
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

function getPresetIndex(items: readonly { id: string }[], id: string): number {
  const index = items.findIndex((item) => item.id === id);
  return index === -1 ? items.length : index;
}

function getDevPreviewSampleMetadata(id: string): { nation: string; rarity: string } | undefined {
  return ({
  "24th_uan": { nation: "poland", rarity: "standard" },
  "37mm_bofors_gun": { nation: "poland", rarity: "limited" },
  "45_mm_antitank_gun": { nation: "soviet", rarity: "standard" },
  "4e_brigade": { nation: "france", rarity: "standard" },
  "641st_rifles": { nation: "soviet", rarity: "elite" },
  "6_pounder": { nation: "britain", rarity: "standard" },
  "6th_brigade_nz_vet": { nation: "anzac", rarity: "standard" },
  "76th_napoli": { nation: "italy", rarity: "standard" },
  "980_volksgrenadier": { nation: "germany", rarity: "standard" },
  "a26_invader": { nation: "us", rarity: "standard" },
  "b29_superfortress": { nation: "us", rarity: "elite" },
  "blackout": { nation: "germany", rarity: "standard" },
  "cannone_da_47": { nation: "italy", rarity: "standard" },
  "careless_talk": { nation: "germany", rarity: "standard" },
  "cup_of_tea": { nation: "britain", rarity: "standard" },
  "decisive_defense": { nation: "italy", rarity: "special" },
  "dingo": { nation: "anzac", rarity: "standard" },
  "farman_f_222": { nation: "france", rarity: "special" },
  "fiat_br_20": { nation: "italy", rarity: "special" },
  "fokker_d_xxi": { nation: "finland", rarity: "limited" },
  "french_75": { nation: "france", rarity: "standard" },
  "friendly_fire": { nation: "finland", rarity: "standard" },
  "front_formation": { nation: "soviet", rarity: "elite" },
  "g4m1_betty": { nation: "japan", rarity: "standard" },
  "gordon_highlanders": { nation: "britain", rarity: "elite" },
  "hampden_mk_i": { nation: "britain", rarity: "limited" },
  "heroes_of_the_soviet_union": { nation: "soviet", rarity: "elite" },
  "hold_the_line": { nation: "poland", rarity: "standard" },
  "honor": { nation: "japan", rarity: "standard" },
  "hotchkiss_h35": { nation: "france", rarity: "standard" },
  "humber_mk_ii": { nation: "britain", rarity: "standard" },
  "i16_ishak": { nation: "soviet", rarity: "standard" },
  "il2m_pl": { nation: "poland", rarity: "limited" },
  "in_the_navy": { nation: "us", rarity: "special" },
  "interception": { nation: "britain", rarity: "standard" },
  "jet_prototype": { nation: "germany", rarity: "limited" },
  "ju_87_b_stuka": { nation: "germany", rarity: "standard" },
  "katalina": { nation: "soviet", rarity: "standard" },
  "kikka": { nation: "japan", rarity: "elite" },
  "l640": { nation: "italy", rarity: "standard" },
  "light_detachment_15": { nation: "finland", rarity: "standard" },
  "m2a4": { nation: "us", rarity: "standard" },
  "m_s_406": { nation: "france", rarity: "standard" },
  "macchi_c_200": { nation: "italy", rarity: "standard" },
  "maus": { nation: "germany", rarity: "elite" },
  "mito_regiment": { nation: "japan", rarity: "standard" },
  "model_25": { nation: "japan", rarity: "standard" },
  "p40_warhawk": { nation: "us", rarity: "standard" },
  "pak_36_fi": { nation: "finland", rarity: "standard" },
  "plan": { nation: "neutral", rarity: "standard" },
  "plan_d": { nation: "france", rarity: "standard" },
  "plan_west": { nation: "poland", rarity: "standard" },
  "pzl_p_7": { nation: "poland", rarity: "standard" },
  "raaf_lightning_f4": { nation: "anzac", rarity: "special" },
  "routed_troops": { nation: "neutral", rarity: "standard" },
  "royal_scots": { nation: "britain", rarity: "standard" },
  "salpa_line": { nation: "finland", rarity: "standard" },
  "sdf": { nation: "britain", rarity: "special" },
  "spitfire_mk_v": { nation: "britain", rarity: "standard" },
  "t19_howitzer": { nation: "us", rarity: "standard" },
  "t26_fi": { nation: "finland", rarity: "standard" },
  "t70": { nation: "soviet", rarity: "standard" },
  "task_force_44": { nation: "anzac", rarity: "standard" },
  "the_regulars_vet": { nation: "us", rarity: "standard" },
  "tks": { nation: "poland", rarity: "standard" },
  "type_88_aa_gun": { nation: "japan", rarity: "standard" },
  "usace": { nation: "us", rarity: "standard" },
  "vanguard": { nation: "italy", rarity: "standard" },
    "wespe": { nation: "germany", rarity: "limited" },
  } satisfies Record<string, { nation: string; rarity: string }>)[id];
}
