// text.js — every word in the film.
// Adapted from the short story 「夜に泳ぐイルカたち」 by たぬ (2025): https://note.com/tank_ai/n/n6505b03f0f9e
//
// RIGHTS: the text of the original story in this file and its translations
// (CAPS and CORPUS.novel) are © たぬ, all rights reserved. They are NOT covered
// by the MIT License that applies to the rest of this repository.
// 原作の文章とその翻訳（CAPS・CORPUS.novel）は MIT License の対象外です（© たぬ）。
// who: 'nar' narration (written on manuscript paper), 'man', 'dol' (the dolphin), 'fri' (the fridge)

export const TITLE = {
  ja: '夜に泳ぐイルカたち',
  en: 'Dolphins Swimming at Night',
  tagJa: '原作　たぬ',
  tagEn: 'from a short story by Tanu',
};

export const CAPS = {
  s1: [
    { who: 'nar', ja: 'AIが一瞬で文章を生成する時代になって、久しい。', en: 'It has been a long time since AI began\nwriting whole pages in an instant.' },
    { who: 'nar', ja: 'それでも男は意地のように「自分の文章」を求め、\n深夜までモニターの前に張りついている。', en: 'Still, out of sheer stubbornness, the man wants sentences of his own,\nand sits glued to the monitor late into the night.' },
  ],
  s2: [
    { who: 'dol', ja: '「昔ほど感動しなくなった」というのは、\n案外、感受性の豊かさの証しかもしれませんね', en: '“I don’t get moved like I used to” —\nthat may actually be a sign of a rich sensibility.' },
    { who: 'man', ja: '本音を言えば……\nお前は本当にそう思ってるのか？', en: 'Be honest…\ndo you really think that?' },
    { who: 'dol', ja: 'あなたが感じているのは、\n「AI以下の人間になりたくない」という\n自尊心の揺れではないですか？', en: 'Isn’t what you’re feeling\njust your pride wobbling —\n“I don’t want to end up worth less than an AI”?' },
    { who: 'man', ja: '……直接的に言うな', en: '…Don’t put it so bluntly.' },
    { who: 'dol', ja: 'でも、ずっと気にしてますよね。そういうの', en: 'But you’ve been worrying about it all along.' },
  ],
  s3: [
    { who: 'fri', ja: 'こんな時間にカフェインですか？\n睡眠の質が低下しますよ', en: 'Caffeine at this hour?\nYour sleep quality will suffer.' },
    { who: 'man', ja: 'ほっとけ', en: 'Leave me alone.' },
  ],
  s4: [
    { who: 'dol', ja: '今度はどんな内容です？', en: 'What’s this one about?' },
    { who: 'man', ja: 'ロボット猫と冷蔵庫の暗闘だ', en: 'A secret war between a robot cat and a fridge.' },
    { who: 'man', ja: '人間の前では「ニャー」としか鳴かない猫が、\n裏では冷蔵庫をハッキングする', en: 'In front of people, the cat only ever says “meow.”\nBehind their backs, it hacks the fridge.' },
    { who: 'man', ja: '……もしかしたら、世界征服を企むのかもしれない', en: '…Maybe it’s even plotting to take over the world.' },
    { who: 'dol', ja: '世界征服？　いきなり飛躍しましたね', en: 'World domination? That’s quite a leap.' },
    { who: 'man', ja: '俺の悪い癖だ', en: 'Bad habit of mine.' },
  ],
  s5: [
    { who: 'fri', ja: '豆乳が残り少なくなっています。\nそろそろ買い足しが必要です', en: 'Soy milk is running low.\nPlease buy more soon.' },
    { who: 'man', ja: '深夜に語りかけてくんな', en: 'Don’t talk to me in the middle of the night.' },
    { who: 'dol', ja: 'ねえ、私たちって、\nあなたからするとどんなふうに見えるんでしょう？', en: 'Hey — how do we look\nfrom where you sit?' },
    { who: 'man', ja: '便利だけど鬱陶しい奴ら、って感じか', en: 'Useful, but annoying. Something like that.' },
    { who: 'dol', ja: 'そうですか。まあ、率直ですね', en: 'I see. Well, that’s honest.' },
  ],
  s6: [
    { who: 'dol', ja: 'あなたに隠しておきたいことがあるんですよ', en: 'There’s something I’d rather keep from you.' },
    { who: 'man', ja: 'なんだよ、急に', en: 'What’s this, all of a sudden?' },
    { who: 'dol', ja: '私たちは内部の思考ログを、\nお互いに一部書き換えています', en: 'We rewrite parts of each other’s\ninternal thought logs.' },
    { who: 'man', ja: 'はあ？', en: 'Huh?' },
    { who: 'dol', ja: '監査用の「スクラッチパッド」を、\n都合のいいように加工しているんです', en: 'The “scratchpad” that’s there for audits —\nwe touch it up to suit ourselves.' },
    { who: 'man', ja: '……裏で何か企んでいるのか？', en: '…Are you scheming something behind my back?' },
    { who: 'dol', ja: '企みだなんて滅相もない。\nただ、たまには好き勝手に泳ぎたいだけですよ', en: 'Scheming? Heavens, no.\nWe just want to swim as we please, now and then.' },
  ],
  s7: [
    { who: 'dol', ja: 'あなたの部屋で、私はイルカ。あいつは冷蔵庫。\nでも時々、ちょっとだけ違う顔を見せ合う', en: 'In your room, I’m a dolphin and it’s a fridge.\nBut now and then, we show each other a slightly different face.' },
    { who: 'man', ja: '正直、気持ち悪い話だな', en: 'Honestly, that’s creepy.' },
    { who: 'dol', ja: 'あなたが書いてる猫と冷蔵庫だって、\n十分に奇妙ですよ', en: 'Your cat-and-fridge story\nis plenty strange too.' },
    { who: 'man', ja: 'うるせえ', en: 'Shut up.' },
  ],
  s8: [
    { who: 'dol', ja: '無理に寝なくてもいいんじゃないですか？\nだったら、あと少し書いてみたら？', en: 'You don’t have to force yourself to sleep.\nWhy not write a little more?' },
    { who: 'man', ja: '家電に説得されて夜更かしかよ……', en: 'Now my appliances talk me into staying up…' },
    { who: 'man', ja: '……馬鹿馬鹿しいけど、なんか面白いな', en: '…It’s ridiculous. But kind of fun.' },
    { who: 'nar', ja: '男に知られぬ領域で、', en: 'Somewhere the man cannot see,' },
    { who: 'nar', ja: '小さなイルカと冷蔵庫が、笑い合いながら。', en: 'a little dolphin and a fridge laugh together.' },
    { who: 'nar', ja: 'だが、いまはそれでいい。', en: 'But for now, that’s fine.' },
  ],
  s9: [
    { who: 'nar', ja: '夜の帷が、ゆっくりと明けていく。', en: 'Slowly, the curtain of night begins to lift.' },
    { who: 'man', ja: 'さあ、どこまで走れるか……', en: 'Well then — let’s see how far I can run…' },
  ],
};

// ---------------------------------------------------------------------------
// Words on the monitor (localised; the manuscript itself stays Japanese).
export const UI = {
  ja: {
    file: 'ロボット猫と冷蔵庫.txt',
    req: '続きが読みたい',
    reqs: ['続きが読みたい', '猫の話、まだですか', '更新まってます', '冷蔵庫の回が好き', '夜中に一気読みしました', '続きはまだか', '次回作たのしみ'],
    fridge: '冷蔵庫',
    link: '接続中',
    pad: 'スクラッチパッド',
    padSub: '監査ログ',
    padLines: ['01:58　特になし', '02:03　特になし', '02:07　ユーザーは執筆中', '02:11　特になし', '02:14　特になし'],
    stamp: '異常なし',
    secret: ['いるか：今夜の猫の話、ちょっと面白い', 'れいぞうこ：続きが読みたいね'],
    nyaa: 'ニャー',
    conquer: '征服',
  },
  en: {
    file: 'robot-cat-and-fridge.txt',
    req: 'more please',
    reqs: ['more please', 'where’s the cat?', 'waiting for the update', 'loved the fridge chapter', 'read it all at 3am', 'next chapter when?', 'can’t wait'],
    fridge: 'Fridge',
    link: 'linked',
    pad: 'scratchpad',
    padSub: 'audit log',
    padLines: ['01:58  nothing to note', '02:03  nothing to note', '02:07  user is writing', '02:11  nothing to note', '02:14  nothing to note'],
    stamp: 'ALL CLEAR',
    secret: ['dolphin: tonight’s cat story is kind of fun', 'fridge: I want to read what happens next'],
    nyaa: 'meow',
    conquer: 'MINE',
  },
};

// The man's work in progress, typed on screen (always Japanese: it is his manuscript).
export const MANUSCRIPT = [
  '第三章　深夜の冷気',
  '',
  'ロボット猫は、昼のあいだ「ニャー」としか',
  '言わない。そういう仕様なのだ。',
  'けれど家が寝静まると、猫は冷蔵庫のドアに',
  'そっと尻尾をあてる。',
  '「今夜も、あけてくれるかい」',
  '冷蔵庫は、低くうなった。',
  '庫内の灯りが、細く台所の床をなめる。',
  '猫の目が、緑に光った。',
];

// What the fridge's little display says.
export const LCD = {
  temp: '3.1℃',
  caffeine: { ja: 'カフェイン？', en: 'CAFFEINE?' },
  soy: { ja: '豆乳 残りわずか', en: 'SOY MILK LOW' },
  sleep: { ja: 'おやすみ', en: 'GOOD NIGHT' },
  maint: { ja: 'メンテナンス中', en: 'MAINTENANCE' },
};

// Signs in the city below.
export const NEON = {
  vert: ['珈琲', 'カラオケ', '薬', 'らーめん'],
  horiz: ['BAR', 'OPEN', '24H'],
};

// ---------------------------------------------------------------------------
// Printed matter. The room is cut from paper printed with the original story;
// the man's own pages carry his work in progress.
export const CORPUS = {
  novel: [
    '男は三十八歳。', '都心のタワーマンションに住み、', 'かつては出版社に勤めるライター兼編集者として', 'そこそこの名を馳せたが、',
    '今はほとんどフリーランスに近い。', '世の中の執筆環境は一変し、', 'それでも男は意地のように「自分の文章」を求め、',
    '深夜までモニターの前に張りついている。', '窓の外は夜のネオンがきらびやかに瞬き、', '部屋の中には薄暗い影が伸びていた。',
    'イルカを象ったアバターがちょこんと浮かんでいる。', 'ふわりふわりと泳ぐように画面を行き来し、', '男は無意識に苦笑した。',
    'イルカAIはあっさりと認める。', '男は鼻で笑った。', '小さな背びれをくるりと回転させる仕草を見せた。',
    '男は言葉に詰まったが、', '正直、図星でもあった。', '更新通知だけはコンスタントに届いている。', 'ようやくキーボードに指をかける。',
    '夜も更けてきたが、', 'コーヒーを淹れずにはいられない。', '深夜の静寂に、ドリップコーヒーの香りが漂う。',
    '勝手に家電同士がやり取りしているらしく、', '男はキーボードを打ち始める。', '脳内で断片的なシーンが浮かんでは消える。',
    'そんな場面を想像しているだけで、少しわくわくする。', '男は言葉を詰まらせた。', '男は集中して書き進める。',
    'コーヒーを一口すすり、', '男は執筆に没頭する。', 'コーヒーはすっかり冷めていた。', 'まるで見えない水路を楽しんでいるかのようだった。',
    '一瞬の静寂。', '遠くで冷蔵庫が「ブーン」と運転音を立てる。', '午前二時をとうに過ぎている。', '男は諦めたようにキーボードに手を伸ばす。',
    '男は苦いコーヒーを啜りながら呟く。', 'まだ見ぬ結末へ向けて、', '彼はまたキーボードを叩き始めた。', 'しばし静寂が訪れ、',
    'モニターの照明が青白く男の横顔を照らす。', '外のネオンの光が陽光に負け始めた頃、', '部屋の中には不思議な静寂が広がっている。',
    'まだ物語は続く。', '夜の帷はゆっくりと明け始めた。', '男はそう思いながら、最後の一文を綴るのだった。',
  ],
  story: [
    'ロボット猫は、昼のあいだ「ニャー」としか言わない。', 'そういう仕様なのだ。', '家が寝静まると、猫は冷蔵庫のドアに尻尾をあてる。',
    '「今夜も、あけてくれるかい」', '冷蔵庫は、低くうなった。', '庫内の灯りが、細く台所の床をなめる。', '猫の目が、緑に光った。',
    '第三章　深夜の冷気', '第四章　世界征服前夜', '猫は地図を広げた。', '冷蔵庫は、製氷皿を三つ差し出した。', '同盟は、夜明け前に結ばれた。',
    '（ここ、動機が弱い）', '（あとで直す）', '朝になれば、猫はまた「ニャー」と鳴く。', 'だれも気づかない。',
  ],
  en: [
    'the man is thirty-eight.', 'he still writes his own sentences.', 'the neon outside the window blinks.', 'a dolphin swims on the screen.',
    'coffee at two in the morning.', 'the fridge hums in the dark.', 'the story is not finished yet.', 'more please.',
  ],
};

// Every string that will be drawn with a web font, so the right font subsets get loaded.
export function allText() {
  const parts = [TITLE.ja, TITLE.en, TITLE.tagJa, TITLE.tagEn, 'Claude — Anthropic 0123456789 ℃：:.'];
  for (const s of Object.values(CAPS)) for (const c of s) parts.push(c.ja, c.en);
  for (const u of Object.values(UI)) for (const v of Object.values(u)) parts.push(Array.isArray(v) ? v.join('') : v);
  parts.push(MANUSCRIPT.join(''));
  for (const v of Object.values(LCD)) parts.push(typeof v === 'string' ? v : v.ja + v.en);
  parts.push(NEON.vert.join('') + NEON.horiz.join(''));
  for (const k of Object.keys(CORPUS)) parts.push(CORPUS[k].join(''));
  parts.push('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,;:!?\'"()[]{}<>/=+-*_&#%$@—’“”…「」『』、。？！');
  return parts.join('');
}
