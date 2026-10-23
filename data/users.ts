export const departments = [
  "営業部",
  "開発部",
  "人事部",
  "経理部",
  "マーケティング部",
  "カスタマーサポート部",
] as const;

export const positions = ["一般社員", "主任", "係長", "課長", "部長"] as const;

export const permissionOptions = [
  { value: "general", label: "一般" },
  { value: "admin", label: "管理者" },
  { value: "readonly", label: "閲覧のみ" },
] as const;

export type UserPermission = (typeof permissionOptions)[number]["value"];

export type User = {
  id: number;
  name: string;
  email: string;
  department: string;
  status: "有効" | "無効";
  createdAt: string;
  position: string;
  permission: UserPermission | "";
  joinDate: string;
  notes: string;
};

export function isUserPermission(value: string): value is UserPermission {
  return permissionOptions.some((option) => option.value === value);
}

const lastNames: { kanji: string; romaji: string }[] = [
  { kanji: "田中", romaji: "tanaka" },
  { kanji: "佐藤", romaji: "sato" },
  { kanji: "鈴木", romaji: "suzuki" },
  { kanji: "高橋", romaji: "takahashi" },
  { kanji: "渡辺", romaji: "watanabe" },
  { kanji: "伊藤", romaji: "ito" },
  { kanji: "山本", romaji: "yamamoto" },
  { kanji: "中村", romaji: "nakamura" },
  { kanji: "小林", romaji: "kobayashi" },
  { kanji: "加藤", romaji: "kato" },
  { kanji: "吉田", romaji: "yoshida" },
  { kanji: "山田", romaji: "yamada" },
  { kanji: "松本", romaji: "matsumoto" },
  { kanji: "井上", romaji: "inoue" },
  { kanji: "木村", romaji: "kimura" },
  { kanji: "林", romaji: "hayashi" },
  { kanji: "清水", romaji: "shimizu" },
  { kanji: "山口", romaji: "yamaguchi" },
  { kanji: "池田", romaji: "ikeda" },
  { kanji: "橋本", romaji: "hashimoto" },
  { kanji: "阿部", romaji: "abe" },
  { kanji: "森", romaji: "mori" },
  { kanji: "石川", romaji: "ishikawa" },
  { kanji: "前田", romaji: "maeda" },
  { kanji: "藤田", romaji: "fujita" },
  { kanji: "岡田", romaji: "okada" },
  { kanji: "後藤", romaji: "goto" },
  { kanji: "長谷川", romaji: "hasegawa" },
  { kanji: "村上", romaji: "murakami" },
  { kanji: "近藤", romaji: "kondo" },
];

const firstNames: { kanji: string; romaji: string }[] = [
  { kanji: "太郎", romaji: "taro" },
  { kanji: "花子", romaji: "hanako" },
  { kanji: "一郎", romaji: "ichiro" },
  { kanji: "美咲", romaji: "misaki" },
  { kanji: "健太", romaji: "kenta" },
  { kanji: "さくら", romaji: "sakura" },
  { kanji: "大輔", romaji: "daisuke" },
  { kanji: "由美", romaji: "yumi" },
  { kanji: "翔太", romaji: "shota" },
  { kanji: "愛", romaji: "ai" },
  { kanji: "直樹", romaji: "naoki" },
  { kanji: "真由美", romaji: "mayumi" },
  { kanji: "拓也", romaji: "takuya" },
  { kanji: "恵", romaji: "megumi" },
  { kanji: "達也", romaji: "tatsuya" },
  { kanji: "彩", romaji: "aya" },
  { kanji: "雄太", romaji: "yuta" },
  { kanji: "麻衣", romaji: "mai" },
  { kanji: "隆", romaji: "takashi" },
  { kanji: "裕子", romaji: "yuko" },
  { kanji: "和也", romaji: "kazuya" },
  { kanji: "明日香", romaji: "asuka" },
  { kanji: "修", romaji: "osamu" },
  { kanji: "結衣", romaji: "yui" },
  { kanji: "浩二", romaji: "koji" },
  { kanji: "陽菜", romaji: "hina" },
  { kanji: "誠", romaji: "makoto" },
  { kanji: "七海", romaji: "nanami" },
  { kanji: "亮", romaji: "ryo" },
  { kanji: "凛", romaji: "rin" },
];

const noteSamples = ["", "", "", "リモート中心", "時短勤務", "管理職候補"];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function shiftIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function generateUsers(): User[] {
  const random = seededRandom(42);
  const users: User[] = [];

  for (let i = 1; i <= 100; i++) {
    const lastName = lastNames[Math.floor(random() * lastNames.length)];
    const firstName = firstNames[Math.floor(random() * firstNames.length)];
    const department = departments[Math.floor(random() * departments.length)];
    const status: User["status"] = random() < 0.8 ? "有効" : "無効";

    const year = 2023 + Math.floor(random() * 3);
    const month = 1 + Math.floor(random() * 12);
    const day = 1 + Math.floor(random() * 28);
    const createdAt = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    // 役職・権限・入社日・備考は別シードで決める。seed=42 の氏名、メール、部署、状態、登録日は変えない。
    const profileRandom = seededRandom(42000 + i);
    const position = positions[Math.floor(profileRandom() * positions.length)];
    const permission =
      permissionOptions[Math.floor(profileRandom() * permissionOptions.length)].value;
    const notes = noteSamples[Math.floor(profileRandom() * noteSamples.length)];
    const joinDate = shiftIsoDate(createdAt, -Math.floor(profileRandom() * 120));

    users.push({
      id: i,
      name: `${lastName.kanji} ${firstName.kanji}`,
      email: `${firstName.romaji}.${lastName.romaji}@example.com`,
      department,
      status,
      createdAt,
      position,
      permission,
      joinDate,
      notes,
    });
  }

  return users;
}

export const users = generateUsers();
