import type { Season } from '$lib/types';

/**
 * シーズン別のフォールバック染料IDセット。
 * Gemini APIが失敗した場合に、定番の推奨染料を返すために使用する。
 *
 * 人手でキュレーションしたリストのため、Gemini経路に課している
 * uniqueCategory（1カテゴリ1色）制約は適用しない。
 * ID・色名の整合はテスト（season-palettes.test.ts）で担保する。
 */
export const seasonFallbackDyes: Record<Season, string[]> = {
  spring: [
    'dye_014', // コーラルピンク (Coral Pink)
    'dye_016', // サーモンピンク (Salmon Pink)
    'dye_019', // サンセットオレンジ (Sunset Orange)
    'dye_040', // ハニーイエロー (Honey Yellow)
    'dye_043', // クリームイエロー (Cream Yellow)
    'dye_062', // セレストグリーン (Celeste Green)
    'dye_100', // パステルブルー (Pastel Blue)
    'dye_095', // パステルピンク (Pastel Pink)
    'dye_008', // ローズピンク (Rose Pink)
  ],
  summer: [
    'dye_009', // ライラックパープル (Lilac Purple)
    'dye_095', // パステルピンク (Pastel Pink)
    'dye_100', // パステルブルー (Pastel Blue)
    'dye_101', // ダークブルー (Dark Blue)
    'dye_003', // アッシュグレイ (Ash Grey)
    'dye_063', // ターコイズグリーン (Turquoise Green)
    'dye_047', // バニライエロー (Vanilla Yellow)
    'dye_008', // ローズピンク (Rose Pink)
    'dye_002', // スノウホワイト (Snow White)
  ],
  autumn: [
    'dye_012', // ラストレッド (Rust Red)
    'dye_019', // サンセットオレンジ (Sunset Orange)
    'dye_025', // コルクブラウン (Cork Brown)
    'dye_024', // コボルドブラウン (Kobold Brown)
    'dye_032', // チェスナットブラウン (Chestnut Brown)
    'dye_053', // オリーブグリーン (Olive Green)
    'dye_051', // モスグリーン (Moss Green)
    'dye_013', // ワインレッド (Wine Red)
    'dye_057', // ハンターグリーン (Hunter Green)
  ],
  winter: [
    'dye_007', // スートブラック (Soot Black)
    'dye_002', // スノウホワイト (Snow White)
    'dye_011', // ダラガブレッド (Dalamud Red)
    'dye_015', // ブラッドレッド (Blood Red)
    'dye_078', // ロイヤルブルー (Royal Blue)
    'dye_101', // ダークブルー (Dark Blue)
    'dye_085', // グルームパープル (Gloom Purple)
    'dye_005', // スレートグレイ (Slate Grey)
    'dye_006', // チャコールグレイ (Charcoal Grey)
  ],
};
