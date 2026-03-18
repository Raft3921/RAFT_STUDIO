// Shared tile definitions for game/editor pages.
// Updated from index copy palette source.
(function(){
  const DARKNESS_BLOCK_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";
  const tiles = [
  {
    "id": 0,
    "name": "air",
    "assetName": null,
    "fallbackPath": null
  },
  {
    "id": 1,
    "name": "grass",
    "assetName": "grass.png",
    "fallbackPath": "assets/grass.png"
  },
  {
    "id": 2,
    "name": "dirt",
    "assetName": "dirt.png",
    "fallbackPath": "assets/dirt.png"
  },
  {
    "id": 3,
    "name": "grass-dirt",
    "assetName": "grass-dirt.png",
    "fallbackPath": "assets/grass-dirt.png"
  },
  {
    "id": 4,
    "name": "dirt2",
    "assetName": "dirt2.png",
    "fallbackPath": "assets/dirt2.png"
  },
  {
    "id": 5,
    "name": "dirt3",
    "assetName": "dirt3.png",
    "fallbackPath": "assets/dirt3.png"
  },
  {
    "id": 6,
    "name": "dirt4",
    "assetName": "dirt4.png",
    "fallbackPath": "assets/dirt4.png"
  },
  {
    "id": 7,
    "name": "dirt2_fh",
    "assetName": "dirt2_fh.png",
    "fallbackPath": "assets/dirt2_fh.png"
  },
  {
    "id": 8,
    "name": "dirt_fh",
    "assetName": "dirt_fh.png",
    "fallbackPath": "assets/dirt_fh.png"
  },
  {
    "id": 9,
    "name": "grass-dirt_fh",
    "assetName": "grass-dirt_fh.png",
    "fallbackPath": "assets/grass-dirt_fh.png"
  },
  {
    "id": 10,
    "name": "grass_fh",
    "assetName": "grass_fh.png",
    "fallbackPath": "assets/grass_fh.png"
  },
  {
    "id": 11,
    "name": "dirt3_fh",
    "assetName": "dirt3_fh.png",
    "fallbackPath": "assets/dirt3_fh.png"
  },
  {
    "id": 12,
    "name": "stone1",
    "assetName": "stone1.png",
    "fallbackPath": "assets/stone1.png"
  },
  {
    "id": 13,
    "name": "stone2",
    "assetName": "stone2.png",
    "fallbackPath": "assets/stone2.png"
  },
  {
    "id": 14,
    "name": "stone-dirt",
    "assetName": "stone-dirt.png",
    "fallbackPath": "assets/stone-dirt.png"
  },
  {
    "id": 15,
    "name": "stone-dirt_fh",
    "assetName": "stone-dirt_fh.png",
    "fallbackPath": "assets/stone-dirt_fh.png"
  },
  {
    "id": 16,
    "name": "stone-grass",
    "assetName": "stone-grass.png",
    "fallbackPath": "assets/stone-grass.png"
  },
  {
    "id": 17,
    "name": "stone-grass_fh",
    "assetName": "stone-grass_fh.png",
    "fallbackPath": "assets/stone-grass_fh.png"
  },
  {
    "id": 18,
    "name": "stone-grass2",
    "assetName": "stone-grass2.png",
    "fallbackPath": "assets/stone-grass2.png"
  },
  {
    "id": 19,
    "name": "stone-grass2_fh",
    "assetName": "stone-grass2_fh.png",
    "fallbackPath": "assets/stone-grass2_fh.png"
  },
  {
    "id": 20,
    "name": "log1",
    "assetName": "log1.png",
    "fallbackPath": "assets/log1.png"
  },
  {
    "id": 21,
    "name": "log2",
    "assetName": "log2.png",
    "fallbackPath": "assets/log2.png"
  },
  {
    "id": 22,
    "name": "leaf1",
    "assetName": "leaf1.png",
    "fallbackPath": "assets/leaf1.png"
  },
  {
    "id": 23,
    "name": "leaf2",
    "assetName": "leaf2.png",
    "fallbackPath": "assets/leaf2.png"
  },
  {
    "id": 24,
    "name": "leaf3",
    "assetName": "leaf3.png",
    "fallbackPath": "assets/leaf3.png"
  },
  {
    "id": 25,
    "name": "leaf4",
    "assetName": "leaf4.png",
    "fallbackPath": "assets/leaf4.png"
  },
  {
    "id": 26,
    "name": "leaf5",
    "assetName": "leaf5.png",
    "fallbackPath": "assets/leaf5.png"
  },
  {
    "id": 27,
    "name": "leaf6",
    "assetName": "leaf6.png",
    "fallbackPath": "assets/leaf6.png"
  },
  {
    "id": 28,
    "name": "leaf5_fh",
    "assetName": "leaf5_fh.png",
    "fallbackPath": "assets/leaf5_fh.png"
  },
  {
    "id": 29,
    "name": "leaf6_fh",
    "assetName": "leaf6_fh.png",
    "fallbackPath": "assets/leaf6_fh.png"
  },
  {
    "id": 30,
    "name": "dirt_back",
    "assetName": "dirt_back.png",
    "fallbackPath": "assets/dirt_back.png"
  },
  {
    "id": 31,
    "name": "stone-dirt_back",
    "assetName": "stone-dirt_back.png",
    "fallbackPath": "assets/stone-dirt_back.png"
  },
  {
    "id": 32,
    "name": "stone-dirt_fh_back",
    "assetName": "stone-dirt_fh_back.png",
    "fallbackPath": "assets/stone-dirt_fh_back.png"
  },
  {
    "id": 33,
    "name": "stone1_back",
    "assetName": "stone1_back.png",
    "fallbackPath": "assets/stone1_back.png"
  },
  {
    "id": 34,
    "name": "poison",
    "assetName": "poison1.png",
    "fallbackPath": "assets/poison1.png"
  },
  {
    "id": 35,
    "name": "sand",
    "assetName": "sand.png",
    "fallbackPath": "assets/sand.png"
  },
  {
    "id": 36,
    "name": "sand-grass",
    "assetName": "sand-grass.png",
    "fallbackPath": "assets/sand-grass.png"
  },
  {
    "id": 37,
    "name": "sand-grass_fh",
    "assetName": "sand-grass_fh.png",
    "fallbackPath": "assets/sand-grass_fh.png"
  },
  {
    "id": 38,
    "name": "sand-dirt",
    "assetName": "sand-dirt.png",
    "fallbackPath": "assets/sand-dirt.png"
  },
  {
    "id": 39,
    "name": "sand-dirt_fh",
    "assetName": "sand-dirt_fh.png",
    "fallbackPath": "assets/sand-dirt_fh.png"
  },
  {
    "id": 40,
    "name": "sand-stone",
    "assetName": "sand-stone.png",
    "fallbackPath": "assets/sand-stone.png"
  },
  {
    "id": 41,
    "name": "sand-stone_fh",
    "assetName": "sand-stone_fh.png",
    "fallbackPath": "assets/sand-stone_fh.png"
  },
  {
    "id": 42,
    "name": "sand-stone2",
    "assetName": "sand-stone2.png",
    "fallbackPath": "assets/sand-stone2.png"
  },
  {
    "id": 43,
    "name": "sand-stone2_fh",
    "assetName": "sand-stone2_fh.png",
    "fallbackPath": "assets/sand-stone2_fh.png"
  },
  {
    "id": 44,
    "name": "ladder",
    "assetName": "ladder.png",
    "fallbackPath": "assets/ladder.png"
  },
  {
    "id": 45,
    "name": "water",
    "assetName": "water.png",
    "fallbackPath": "assets/water.png"
  },
  {
    "id": 46,
    "name": "water2",
    "assetName": "water2.png",
    "fallbackPath": "assets/water2.png"
  },
  {
    "id": 47,
    "name": "treasure_chest",
    "assetName": "treasure_chest_nomal.png",
    "fallbackPath": "assets/treasure_chest_nomal.png"
  },
  {
    "id": 48,
    "name": "rock1",
    "assetName": "rock1.png",
    "fallbackPath": "assets/rock1.png"
  },
  {
    "id": 49,
    "name": "rock2",
    "assetName": "rock2.png",
    "fallbackPath": "assets/rock2.png"
  },
  {
    "id": 50,
    "name": "rock3",
    "assetName": "rock3.png",
    "fallbackPath": "assets/rock3.png"
  },
  {
    "id": 51,
    "name": "rock2_fh",
    "assetName": "rock2_fh.png",
    "fallbackPath": "assets/rock2_fh.png"
  },
  {
    "id": 54,
    "name": "trampoline_mushroom",
    "assetName": "trampoline_mushroom.png",
    "fallbackPath": "assets/trampoline_mushroom.png"
  },
  {
    "id": 58,
    "name": "slime",
    "assetName": "idle1.png",
    "fallbackPath": "assets/slime/feel/idle1.png"
  },
  {
    "id": 59,
    "name": "sand-log1",
    "assetName": "sand-log1.png",
    "fallbackPath": "assets/sand-log1.png"
  },
  {
    "id": 60,
    "name": "sand-leaf1",
    "assetName": "sand-leaf1.png",
    "fallbackPath": "assets/sand-leaf1.png"
  },
  {
    "id": 61,
    "name": "sand-leaf2",
    "assetName": "sand-leaf2.png",
    "fallbackPath": "assets/sand-leaf2.png"
  },
  {
    "id": 62,
    "name": "sand-leaf3",
    "assetName": "sand-leaf3.png",
    "fallbackPath": "assets/sand-leaf3.png"
  },
  {
    "id": 63,
    "name": "sand-leaf4",
    "assetName": "sand-leaf4.png",
    "fallbackPath": "assets/sand-leaf4.png"
  },
  {
    "id": 64,
    "name": "sand-leaf5",
    "assetName": "sand-leaf5.png",
    "fallbackPath": "assets/sand-leaf5.png"
  },
  {
    "id": 65,
    "name": "sand-leaf6",
    "assetName": "sand-leaf6.png",
    "fallbackPath": "assets/sand-leaf6.png"
  },
  {
    "id": 66,
    "name": "sand-leaf5_fh",
    "assetName": "sand-leaf5_fh.png",
    "fallbackPath": "assets/sand-leaf5_fh.png"
  },
  {
    "id": 67,
    "name": "sand-leaf6_fh",
    "assetName": "sand-leaf6_fh.png",
    "fallbackPath": "assets/sand-leaf6_fh.png"
  },
  {
    "id": 68,
    "name": "stone-break1",
    "assetName": "stone-break1.png",
    "fallbackPath": "assets/stone-break1.png"
  },
  {
    "id": 69,
    "name": "stone-break2",
    "assetName": "stone-break2.png",
    "fallbackPath": "assets/stone-break2.png"
  },
  {
    "id": 70,
    "name": "stone-break3",
    "assetName": "stone-break3.png",
    "fallbackPath": "assets/stone-break3.png"
  },
  {
    "id": 71,
    "name": "snake",
    "assetName": "idle1.png",
    "fallbackPath": "assets/snake/idle1.png"
  },
  {
    "id": 72,
    "name": "leaf_block",
    "assetName": "leaf1.png",
    "fallbackPath": "assets/leaf1.png"
  },
  {
    "id": 73,
    "name": "leaf_block1",
    "assetName": "leaf_block1.png",
    "fallbackPath": "assets/leaf_block1.png"
  },
  {
    "id": 74,
    "name": "leaf_block2",
    "assetName": "leaf_block2.png",
    "fallbackPath": "assets/leaf_block2.png"
  },
  {
    "id": 75,
    "name": "small_stone",
    "assetName": "small_stone.png",
    "fallbackPath": "assets/small_stone.png"
  },
  {
    "id": 76,
    "name": "bushes",
    "assetName": "bushes.png",
    "fallbackPath": "assets/bushes.png"
  },
  {
    "id": 77,
    "name": "moss",
    "assetName": "moss.png",
    "fallbackPath": "assets/moss.png"
  },
  {
    "id": 78,
    "name": "grass-leaf",
    "assetName": "grass-leaf.png",
    "fallbackPath": "assets/grass-leaf.png"
  },
  {
    "id": 79,
    "name": "limestone-cave_fh",
    "assetName": "limestone-cave_fh.png",
    "fallbackPath": "assets/limestone-cave_fh.png"
  },
  {
    "id": 80,
    "name": "limestone-cave",
    "assetName": "limestone-cave.png",
    "fallbackPath": "assets/limestone-cave.png"
  },
  {
    "id": 81,
    "name": "paralysis_slime",
    "assetName": "slime/paralysis/idle1.png",
    "fallbackPath": "assets/slime/paralysis/idle1.png"
  },
  {
    "id": 82,
    "name": "giant_slime",
    "assetName": "idle1.png",
    "fallbackPath": "assets/slime/giant_slime_lv1/idle1.png"
  },
  {
    "id": 83,
    "name": "dark-grass",
    "assetName": "dark-grass.png",
    "fallbackPath": "assets/dark-grass.png"
  },
  {
    "id": 84,
    "name": "dark-dirt",
    "assetName": "dark-dirt.png",
    "fallbackPath": "assets/dark-dirt.png"
  },
  {
    "id": 85,
    "name": "dark-leaf1",
    "assetName": "leaf1.png",
    "fallbackPath": "assets/leaf1.png"
  },
  {
    "id": 86,
    "name": "dark-leaf2",
    "assetName": "leaf2.png",
    "fallbackPath": "assets/leaf2.png"
  },
  {
    "id": 87,
    "name": "dark-leaf3",
    "assetName": "leaf3.png",
    "fallbackPath": "assets/leaf3.png"
  },
  {
    "id": 89,
    "name": "cloud",
    "assetName": "cloud.png",
    "fallbackPath": "assets/cloud.png"
  },
  {
    "id": 90,
    "name": "cloud1",
    "assetName": "cloud2.png",
    "fallbackPath": "assets/cloud2.png"
  },
  {
    "id": 91,
    "name": "cloud2",
    "assetName": "cloud3.png",
    "fallbackPath": "assets/cloud3.png"
  },
  {
    "id": 92,
    "name": "move_enemy",
    "assetName": "move_enemy/1.png",
    "fallbackPath": "assets/move_enemy/1.png"
  },
  {
    "id": 150,
    "name": "great_serpent_head",
    "assetName": "great_snake/head.png",
    "fallbackPath": "assets/great_snake/head.png"
  },
  {
    "id": 151,
    "name": "great_serpent_body",
    "assetName": "great_snake/body.png",
    "fallbackPath": "assets/great_snake/body.png"
  },
  {
    "id": 152,
    "name": "great_serpent_tail",
    "assetName": "great_snake/tail.png",
    "fallbackPath": "assets/great_snake/tail.png"
  },
  {
    "id": 240,
    "name": "sandbag_switch",
    "assetName": "sandbag_switch.png",
    "fallbackPath": "assets/sandbag_switch.png"
  },
  {
    "id": 241,
    "name": "white_gate",
    "assetName": "white_gate.png",
    "fallbackPath": "assets/white_gate.png"
  },
  {
    "id": 242,
    "name": "sandbag_spawn",
    "assetName": "slime/feel/idle1.png",
    "fallbackPath": "assets/slime/feel/idle1.png"
  },
  {
    "id": 243,
    "name": "white_block",
    "assetName": "white_block.png",
    "fallbackPath": "assets/white_block.png"
  },
  {
    "id": 244,
    "name": "red_carpet1",
    "assetName": "red_carpet1.png",
    "fallbackPath": "assets/red_carpet1.png"
  },
  {
    "id": 245,
    "name": "red_carpet2",
    "assetName": "red_carpet2.png",
    "fallbackPath": "assets/red_carpet2.png"
  },
  {
    "id": 246,
    "name": "red_carpet3",
    "assetName": "red_carpet3.png",
    "fallbackPath": "assets/red_carpet3.png"
  },
  {
    "id": 247,
    "name": "red_carpet4",
    "assetName": "red_carpet4.png",
    "fallbackPath": "assets/red_carpet4.png"
  },
  {
    "id": 248,
    "name": "red_carpet5",
    "assetName": "red_carpet5.png",
    "fallbackPath": "assets/red_carpet5.png"
  },
  {
    "id": 249,
    "name": "red_carpet6",
    "assetName": "red_carpet6.png",
    "fallbackPath": "assets/red_carpet6.png"
  },
  {
    "id": 250,
    "name": "red_carpet7",
    "assetName": "red_carpet7.png",
    "fallbackPath": "assets/red_carpet7.png"
  },
  {
    "id": 251,
    "name": "red_carpet8",
    "assetName": "red_carpet8.png",
    "fallbackPath": "assets/red_carpet8.png"
  },
  {
    "id": 252,
    "name": "lantern",
    "assetName": "lantern.png",
    "fallbackPath": "assets/lantern.png"
  },
  {
    "id": 253,
    "name": "red_carpet9",
    "assetName": "red_carpet9.png",
    "fallbackPath": "assets/red_carpet9.png"
  },
  {
    "id": 254,
    "name": "save_point",
    "assetName": "save_point.png",
    "fallbackPath": "assets/save_point.png"
  },
  {
    "id": 255,
    "name": "player_barrier_invisible",
    "assetName": null,
    "fallbackPath": "assets/white_block.png"
  },
  {
    "id": 256,
    "name": "monster_barrier_invisible",
    "assetName": null,
    "fallbackPath": "assets/white_block.png"
  },
  {
    "id": 257,
    "name": "dark_brick",
    "assetName": "dark_brick.png",
    "fallbackPath": "assets/dark_brick.png"
  },
  {
    "id": 258,
    "name": "dark_brick2",
    "assetName": "dark_brick.png",
    "fallbackPath": "assets/dark_brick.png"
  },
  {
    "id": 259,
    "name": "grass_white",
    "assetName": "grass_white.png",
    "fallbackPath": "assets/grass_white.png"
  },
  {
    "id": 260,
    "name": "dirt_white",
    "assetName": "dirt_white.png",
    "fallbackPath": "assets/dirt_white.png"
  },
  {
    "id": 261,
    "name": "dirt2_fh_white",
    "assetName": "dirt2_fh_white.png",
    "fallbackPath": "assets/dirt2_fh_white.png"
  },
  {
    "id": 262,
    "name": "dirt2_white",
    "assetName": "dirt2_white.png",
    "fallbackPath": "assets/dirt2_white.png"
  },
  {
    "id": 263,
    "name": "dirt3_white",
    "assetName": "dirt3_white.png",
    "fallbackPath": "assets/dirt3_white.png"
  },
  {
    "id": 264,
    "name": "dirt4_white",
    "assetName": "dirt4_white.png",
    "fallbackPath": "assets/dirt4_white.png"
  },
  {
    "id": 265,
    "name": "dirt_fh_white",
    "assetName": "dirt_fh_white.png",
    "fallbackPath": "assets/dirt_fh_white.png"
  },
  {
    "id": 266,
    "name": "grass-dirt2_white",
    "assetName": "grass-dirt2_white.png",
    "fallbackPath": "assets/grass-dirt2_white.png"
  },
  {
    "id": 267,
    "name": "grass-dirt3_white",
    "assetName": "grass-dirt3_white.png",
    "fallbackPath": "assets/grass-dirt3_white.png"
  },
  {
    "id": 268,
    "name": "grass-dirt_fh_white",
    "assetName": "grass-dirt_fh_white.png",
    "fallbackPath": "assets/grass-dirt_fh_white.png"
  },
  {
    "id": 269,
    "name": "grass-dirt_white",
    "assetName": "grass-dirt_white.png",
    "fallbackPath": "assets/grass-dirt_white.png"
  },
  {
    "id": 270,
    "name": "grass_slope_fh_white",
    "assetName": "grass_slope_fh_white.png",
    "fallbackPath": "assets/grass_slope_fh_white.png"
  },
  {
    "id": 271,
    "name": "grass_slope_white",
    "assetName": "grass_slope_white.png",
    "fallbackPath": "assets/grass_slope_white.png"
  },
  {
    "id": 272,
    "name": "letter_H",
    "assetName": "H.png",
    "fallbackPath": "assets/H.png"
  },
  {
    "id": 273,
    "name": "letter_A",
    "assetName": "A.png",
    "fallbackPath": "assets/A.png"
  },
  {
    "id": 274,
    "name": "letter_P",
    "assetName": "P.png",
    "fallbackPath": "assets/P.png"
  },
  {
    "id": 275,
    "name": "letter_Y",
    "assetName": "Y.png",
    "fallbackPath": "assets/Y.png"
  },
  {
    "id": 276,
    "name": "letter_B",
    "assetName": "B.png",
    "fallbackPath": "assets/B.png"
  },
  {
    "id": 277,
    "name": "letter_I",
    "assetName": "I.png",
    "fallbackPath": "assets/I.png"
  },
  {
    "id": 278,
    "name": "letter_R",
    "assetName": "R.png",
    "fallbackPath": "assets/R.png"
  },
  {
    "id": 279,
    "name": "letter_T",
    "assetName": "T.png",
    "fallbackPath": "assets/T.png"
  },
  {
    "id": 280,
    "name": "letter_D",
    "assetName": "D.png",
    "fallbackPath": "assets/D.png"
  },
  {
    "id": 291,
    "name": "letter_F",
    "assetName": "F.png",
    "fallbackPath": "assets/F.png"
  },
  {
    "id": 281,
    "name": "brother",
    "assetName": "brother.png",
    "fallbackPath": "assets/brother.png"
  },
  {
    "id": 282,
    "name": "darkness_block",
    "assetName": null,
    "fallbackPath": "__DARKNESS_BLOCK_PIXEL__"
  },
  {
    "id": 283,
    "name": "grass_slope_fh",
    "assetName": "grass_slope_fh.png",
    "fallbackPath": "assets/grass_slope_fh.png"
  },
  {
    "id": 284,
    "name": "grass_slope",
    "assetName": "grass_slope.png",
    "fallbackPath": "assets/grass_slope.png"
  },
  {
    "id": 285,
    "name": "sand_slope_fh",
    "assetName": "sand_slope_fh.png",
    "fallbackPath": "assets/sand_slope_fh.png"
  },
  {
    "id": 286,
    "name": "sand_slope",
    "assetName": "sand_slope.png",
    "fallbackPath": "assets/sand_slope.png"
  },
  {
    "id": 287,
    "name": "white_leaf2",
    "assetName": "white-leaf2.png",
    "fallbackPath": "assets/white-leaf2.png"
  },
  {
    "id": 288,
    "name": "white_leaf3",
    "assetName": "white-leaf3.png",
    "fallbackPath": "assets/white-leaf3.png"
  },
  {
    "id": 289,
    "name": "white_leaf4",
    "assetName": "white-leaf4.png",
    "fallbackPath": "assets/white-leaf4.png"
  },
  {
    "id": 290,
    "name": "poison2",
    "assetName": "poison4.png",
    "fallbackPath": "assets/poison4.png"
  },
  {
    "id": 401,
    "name": "net",
    "assetName": "net/idle1.png",
    "fallbackPath": "assets/net/idle1.png"
  },
  {
    "id": 402,
    "name": "rail",
    "assetName": "rail.png",
    "fallbackPath": "assets/rail.png"
  },
  {
    "id": 403,
    "name": "rail2",
    "assetName": "rail2.png",
    "fallbackPath": "assets/rail2.png"
  }
];

  const byId = {};
  const nameById = {};
  for (const tile of tiles) {
    if (!tile || !Number.isFinite(Number(tile.id))) continue;
    const id = Number(tile.id);
    byId[id] = tile;
    if (typeof tile.name === 'string' && tile.name) nameById[id] = tile.name;
  }

  window.RAFT_TILE_DEFINITIONS = {
    version: 1,
    tiles,
    byId,
    nameById,
    darknessBlockPixel: DARKNESS_BLOCK_PIXEL
  };
})();
