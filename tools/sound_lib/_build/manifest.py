"""Curated manifest for tools/sound_lib.

Each SFX entry: (source_key, source_filename, output_id, [tags])
source_filename is matched by basename inside the source's download folder
(or "Family/basename" when a pack has duplicate basenames).

Tags were assigned from filenames, pack descriptions and simple signal
analysis (duration, spectral balance, pitch contour for jingles).
"""

KENNEY_LICENSE = "CC0"
KENNEY_LICENSE_URL = "https://creativecommons.org/publicdomain/zero/1.0/"

SOURCES = {
    # key: (download dir, display name, page url, author, license)
    "ki":  ("interface-sounds", "Kenney Interface Sounds", "https://kenney.nl/assets/interface-sounds", "Kenney", "CC0"),
    "ku":  ("ui-audio", "Kenney UI Audio", "https://kenney.nl/assets/ui-audio", "Kenney", "CC0"),
    "kd":  ("digital-audio", "Kenney Digital Audio", "https://kenney.nl/assets/digital-audio", "Kenney", "CC0"),
    "kim": ("impact-sounds", "Kenney Impact Sounds", "https://kenney.nl/assets/impact-sounds", "Kenney", "CC0"),
    "kc":  ("casino-audio", "Kenney Casino Audio", "https://kenney.nl/assets/casino-audio", "Kenney", "CC0"),
    "kr":  ("rpg-audio", "Kenney RPG Audio", "https://kenney.nl/assets/rpg-audio", "Kenney", "CC0"),
    "ks":  ("sci-fi-sounds", "Kenney Sci-fi Sounds", "https://kenney.nl/assets/sci-fi-sounds", "Kenney", "CC0"),
    "kj":  ("music-jingles", "Kenney Music Jingles", "https://kenney.nl/assets/music-jingles", "Kenney", "CC0"),
    "kv":  ("voiceover-pack", "Kenney Voiceover Pack", "https://kenney.nl/assets/voiceover-pack", "Kenney", "CC0"),
    "o100": ("oga-100cc0", "100 CC0 SFX (OpenGameArt)", "https://opengameart.org/content/100-cc0-sfx", "rubberduck", "CC0"),
    "o512": ("oga-512", "512 Sound Effects 8-bit style (OpenGameArt)", "https://opengameart.org/content/512-sound-effects-8-bit-style", "Juhani Junkala (SubspaceAudio)", "CC0"),
    "osp": ("oga-soundpack01", "Level up, power up, Coin get (OpenGameArt)", "https://opengameart.org/content/level-up-power-up-coin-get-13-sounds", "wobbleboxx", "CC0"),
    "opc": ("oga-pops-cogito", "Pop sounds (OpenGameArt)", "https://opengameart.org/content/pop-sounds", "cogitollc", "CC0"),
    "ope": ("oga-pops-ezd", "Pop sounds (OpenGameArt)", "https://opengameart.org/content/pop-sounds-0", "EZduzziteh", "CC0"),
    "o3p": ("oga-3pops", "3 Pop Sounds (OpenGameArt)", "https://opengameart.org/content/3-pop-sounds", "wubitog", "CC0"),
    "obp": ("oga-bubblespop", "bubbles 'pop' (OpenGameArt)", "https://opengameart.org/content/bubbles-pop", "farfadet46", "CC0"),
    "obb": ("oga-bubbles", "Bubble Sound Effects (OpenGameArt)", "https://opengameart.org/content/bubble-sound-effects", "BMacZero", "CC0"),
    "omg": ("oga-magic", "Magic Spell SFX (OpenGameArt)", "https://opengameart.org/content/magic-spell-sfx", "JaggedStone", "CC0"),
    "osw": ("oga-swoosh", "Swish - bamboo stick weapon swhoshes (OpenGameArt)", "https://opengameart.org/node/2242", "qubodup", "CC0"),
}

S = []  # sfx manifest


def add(src, files, prefix, tags, start=1):
    for i, f in enumerate(files, start):
        S.append((src, f, f"{prefix}_{i:02d}", list(tags)))


# ---------------------------------------------------------------- UI / taps
add("ki", ["click_001.ogg", "click_002.ogg", "click_003.ogg", "click_005.ogg"], "ui_click_soft", ["tap", "click", "ui", "soft"])
add("ku", ["click1.ogg", "click2.ogg", "click3.ogg", "click5.ogg"], "ui_click", ["tap", "click", "ui"])
add("ki", ["select_001.ogg", "select_002.ogg", "select_007.ogg", "select_008.ogg"], "ui_tap_short", ["tap", "click", "ui", "select"])
add("ki", ["select_003.ogg", "select_004.ogg", "select_005.ogg"], "ui_select", ["tap", "ui", "select", "confirm"])
add("ku", ["rollover1.ogg", "rollover3.ogg", "rollover4.ogg"], "ui_hover", ["tap", "ui", "soft", "hover"])
add("ki", ["toggle_001.ogg", "toggle_002.ogg", "toggle_003.ogg", "toggle_004.ogg"], "ui_toggle", ["tap", "click", "ui", "toggle"])
add("ki", ["switch_003.ogg", "switch_004.ogg", "switch_005.ogg"], "ui_switch", ["click", "ui", "toggle", "switch"])
add("ku", ["switch3.ogg", "switch7.ogg", "switch13.ogg", "switch16.ogg", "switch22.ogg", "switch26.ogg", "switch31.ogg", "switch33.ogg"], "ui_switch_mech", ["click", "ui", "switch", "toggle"])
add("ki", ["open_001.ogg", "open_002.ogg", "open_003.ogg", "open_004.ogg"], "ui_open", ["ui_open", "ui", "popup"])
add("ki", ["close_001.ogg", "close_002.ogg", "close_003.ogg", "close_004.ogg"], "ui_close", ["ui_close", "ui", "popup"])
add("ki", ["maximize_002.ogg", "maximize_004.ogg", "maximize_005.ogg", "maximize_007.ogg"], "ui_expand", ["ui_open", "ui", "whoosh", "slide"])
add("ki", ["minimize_002.ogg", "minimize_004.ogg", "minimize_005.ogg", "minimize_007.ogg"], "ui_collapse", ["ui_close", "ui", "whoosh", "slide"])
add("ki", ["back_001.ogg", "back_002.ogg", "back_003.ogg"], "ui_back", ["ui_close", "ui", "back", "tap"])
add("ki", ["confirmation_001.ogg", "confirmation_002.ogg", "confirmation_003.ogg", "confirmation_004.ogg"], "ui_confirm_chime", ["confirm", "chime", "success", "ui", "positive"])
add("ki", ["question_001.ogg", "question_003.ogg"], "ui_question", ["notify", "ui", "question"])
add("ki", ["bong_001.ogg"], "ui_bong", ["notify", "ui", "low", "soft"])
add("ki", ["error_001.ogg", "error_002.ogg", "error_003.ogg", "error_004.ogg", "error_006.ogg", "error_007.ogg"], "ui_error", ["error", "fail", "ui", "negative"])
add("ki", ["glass_001.ogg", "glass_002.ogg", "glass_003.ogg", "glass_004.ogg", "glass_005.ogg"], "ui_glass_tink", ["glass", "chime", "tap", "sparkle", "bright"])
add("ki", ["drop_001.ogg", "drop_002.ogg", "drop_003.ogg", "drop_004.ogg"], "ui_drop_bloop", ["drop", "pop", "soft", "ui"])
add("ki", ["pluck_001.ogg", "pluck_002.ogg"], "ui_pluck", ["pop", "tap", "cute", "pluck"])
add("ki", ["tick_001.ogg", "tick_002.ogg", "tick_004.ogg"], "tick", ["tick", "countdown", "click", "timer"])
add("ki", ["scroll_001.ogg", "scroll_004.ogg"], "ui_scroll_ratchet", ["slide", "tick", "ui", "scroll"])

# ---------------------------------------------------------------- pops / bubbles
add("opc", ["pop1.ogg", "pop2.ogg", "pop3.ogg", "pop5.ogg", "pop7.ogg", "pop9.ogg"], "pop_bright", ["pop", "merge", "match", "bubble", "bright", "cartoon"])
add("ope", ["pop1.wav", "pop3.wav", "pop4.wav", "pop8.wav", "pop9.wav"], "pop_mouth", ["pop", "merge", "cute", "cartoon", "soft", "ui"])
add("o3p", ["pop1.ogg", "pop2.ogg", "pop3.ogg"], "pop_bubble", ["pop", "bubble", "match", "soft"])
add("obp", ["pop.ogg"], "bubble_pop", ["pop", "bubble", "water", "soft"])
add("obb", ["bubbles-single1.wav", "bubbles-single2.wav", "bubbles-single3.wav"], "bubbles_water", ["bubble", "water", "soft", "low"])
add("o100", ["plop_01.ogg", "plop_02.ogg"], "plop", ["pop", "drop", "water", "cartoon"])
add("o100", ["splash_01.ogg", "splash_02.ogg"], "water_splash", ["water", "splash", "drop"])
add("ks", ["slime_000.ogg"], "slime_squish", ["squish", "water", "cartoon", "soft"])

# ---------------------------------------------------------------- coins / collect / reward
add("kc", ["chips-stack-1.ogg", "chips-stack-2.ogg", "chips-stack-4.ogg", "chips-stack-6.ogg"], "coin_stack", ["coin", "collect", "reward", "metal"])
add("kc", ["chips-collide-1.ogg", "chips-collide-3.ogg"], "coin_clink", ["coin", "collect", "metal", "bright"])
add("kc", ["chips-handle-1.ogg", "chips-handle-4.ogg"], "coin_handful", ["coin", "collect", "reward"])
add("kr", ["handleCoins.ogg", "handleCoins2.ogg"], "coin_pouch", ["coin", "collect", "reward", "metal"])
add("o512", ["sfx_coin_single1.wav", "sfx_coin_single2.wav", "sfx_coin_single3.wav", "sfx_coin_single6.wav"], "coin_retro", ["coin", "collect", "retro", "8bit", "bright"])
add("o512", ["sfx_coin_double2.wav", "sfx_coin_double6.wav"], "coin_retro_double", ["coin", "collect", "retro", "8bit", "combo"])
add("o512", ["sfx_coin_cluster3.wav", "sfx_coin_cluster5.wav", "sfx_coin_cluster9.wav"], "coin_retro_cluster", ["coin", "collect", "reward", "retro", "8bit", "combo"])
add("osp", ["Coin01.aif"], "coin_sparkle_synth", ["coin", "collect", "sparkle", "reward", "synth"])
add("o512", ["sfx_sound_bling.wav"], "bling_sparkle", ["sparkle", "chime", "reward", "collect", "bright", "retro"])
add("o100", ["bell_01.ogg", "bell_02.ogg", "bell_03.ogg"], "bell_ding", ["chime", "bell", "reward", "notify", "metal", "bright"])
add("kim", ["impactBell_heavy_000.ogg", "impactBell_heavy_002.ogg", "impactBell_heavy_004.ogg"], "bell_hit_heavy", ["bell", "chime", "metal", "heavy", "low"])

# ---------------------------------------------------------------- positive tones / powerups / level up
add("kd", ["pepSound1.ogg", "pepSound2.ogg", "pepSound3.ogg", "pepSound5.ogg"], "pep_blip", ["positive", "chime", "cute", "collect", "synth"])
add("kd", ["twoTone1.ogg", "twoTone2.ogg", "threeTone1.ogg", "threeTone2.ogg"], "tone_chime", ["chime", "notify", "confirm", "synth"])
add("kd", ["powerUp1.ogg", "powerUp2.ogg", "powerUp3.ogg", "powerUp5.ogg", "powerUp7.ogg", "powerUp9.ogg", "powerUp11.ogg", "powerUp12.ogg"], "powerup_synth", ["powerup", "level_up", "positive", "synth", "bright"])
add("kd", ["phaserUp1.ogg", "phaserUp3.ogg", "phaserUp5.ogg", "phaserUp7.ogg"], "rise_phaser", ["powerup", "rise", "magic", "synth"])
add("kd", ["zapThreeToneUp.ogg"], "level_up_zap", ["level_up", "powerup", "win", "synth"])
add("kd", ["highUp.ogg"], "sweep_up", ["jump", "rise", "swipe", "synth", "bright"])
add("kd", ["highDown.ogg"], "sweep_down", ["drop", "fall", "swipe", "synth"])
add("osp", ["Rise01.aif", "Rise02.aif", "Rise03.aif", "Rise06.aif"], "level_up_rise", ["level_up", "powerup", "rise", "reward", "synth"])
add("osp", ["Upper01.aif"], "powerup_upper", ["powerup", "level_up", "rise", "synth"])
add("o512", ["sfx_sounds_powerup1.wav", "sfx_sounds_powerup2.wav", "sfx_sounds_powerup4.wav", "sfx_sounds_powerup9.wav", "sfx_sounds_powerup12.wav", "sfx_sounds_powerup16.wav"], "powerup_retro", ["powerup", "level_up", "retro", "8bit"])
add("o512", ["sfx_sounds_fanfare1.wav", "sfx_sounds_fanfare2.wav", "sfx_sounds_fanfare3.wav"], "fanfare_retro", ["fanfare", "win", "reward", "retro", "8bit"])
add("ks", ["forceField_000.ogg", "forceField_002.ogg"], "shield_forcefield", ["powerup", "magic", "shield", "scifi"])

# ---------------------------------------------------------------- magic
add("omg", ["magical_1.ogg", "magical_2.ogg", "magical_3.ogg", "magical_4.ogg", "magical_5.ogg", "magical_7.ogg"], "magic_spell", ["magic", "sparkle", "powerup", "unlock"])
add("o512", ["sfx_movement_portal1.wav", "sfx_movement_portal5.wav"], "magic_portal_retro", ["magic", "teleport", "whoosh", "retro", "8bit"])

# ---------------------------------------------------------------- negative / fail / lose
add("kd", ["phaserDown1.ogg", "phaserDown3.ogg"], "fail_phaser_down", ["fail", "lose", "negative", "synth"])
add("kd", ["zapThreeToneDown.ogg", "lowThreeTone.ogg", "lowDown.ogg"], "fail_tone_down", ["fail", "lose", "negative", "low", "synth"])
add("kd", ["lowRandom.ogg"], "error_low_buzz", ["error", "fail", "low", "synth"])
add("osp", ["Downer01.aif"], "lose_downer", ["lose", "fail", "negative", "synth"])
add("o512", ["sfx_sounds_negative1.wav", "sfx_sounds_negative2.wav"], "lose_retro", ["lose", "fail", "negative", "retro", "8bit"])
add("o512", ["sfx_sounds_error1.wav", "sfx_sounds_error5.wav", "sfx_sounds_error11.wav"], "error_retro", ["error", "fail", "negative", "retro", "8bit"])

# ---------------------------------------------------------------- whoosh / swipe / slide
add("osw", ["swosh-01.flac", "swosh-06.flac", "swosh-09.flac", "swosh-22.flac", "swosh-25.flac"], "whoosh_short", ["whoosh", "swipe", "fast"])
add("osw", ["swosh-05.flac", "swosh-13.flac", "swosh-29.flac", "swosh-37.flac", "swosh-43.flac"], "whoosh_medium", ["whoosh", "swipe", "slide"])
add("osw", ["swosh-31.flac", "swosh-34.flac"], "whoosh_long", ["whoosh", "slide", "low"])
add("kr", ["knifeSlice.ogg", "knifeSlice2.ogg"], "slice_swish", ["whoosh", "swipe", "slice", "bright"])
add("kc", ["card-slide-1.ogg", "card-slide-3.ogg", "card-slide-5.ogg", "card-slide-7.ogg"], "card_slide", ["slide", "swipe", "card", "soft", "paper"])
add("kc", ["card-place-1.ogg", "card-place-2.ogg", "card-place-4.ogg"], "card_place", ["drop", "land", "card", "soft", "paper"])
add("kc", ["card-fan-1.ogg"], "card_fan", ["swipe", "card", "slide", "paper"])
add("kc", ["card-shuffle.ogg"], "card_shuffle", ["shuffle", "card", "paper"])
add("kc", ["cards-pack-open-1.ogg"], "card_pack_open", ["ui_open", "unlock", "reward", "paper"])
add("kr", ["bookFlip1.ogg", "bookFlip3.ogg"], "page_flip", ["swipe", "paper", "ui", "soft"])
add("kr", ["bookOpen.ogg"], "book_open", ["ui_open", "paper", "soft"])
add("kr", ["bookClose.ogg"], "book_close", ["ui_close", "paper", "soft"])
add("kr", ["cloth1.ogg", "cloth3.ogg"], "cloth_rustle", ["swipe", "soft", "cloth"])
add("o100", ["paper_01.ogg", "paper_02.ogg"], "paper_rustle", ["paper", "swipe", "soft"])

# ---------------------------------------------------------------- impacts / hits / landing
add("kim", ["impactSoft_medium_000.ogg", "impactSoft_medium_002.ogg", "impactSoft_medium_004.ogg"], "thud_soft", ["land", "drop", "impact", "soft", "low"])
add("kim", ["impactSoft_heavy_000.ogg", "impactSoft_heavy_002.ogg", "impactSoft_heavy_004.ogg"], "thud_heavy", ["land", "impact", "heavy", "low"])
add("kim", ["impactGeneric_light_000.ogg", "impactGeneric_light_002.ogg", "impactGeneric_light_004.ogg"], "hit_light", ["hit", "impact", "tap", "soft"])
add("kim", ["impactPunch_medium_000.ogg", "impactPunch_medium_002.ogg", "impactPunch_heavy_000.ogg", "impactPunch_heavy_003.ogg"], "punch", ["hit", "impact", "punch", "heavy", "low"])
add("kim", ["impactWood_light_000.ogg", "impactWood_light_002.ogg"], "wood_tap", ["wood", "hit", "tap", "drop"])
add("kim", ["impactWood_medium_000.ogg", "impactWood_medium_002.ogg"], "wood_knock", ["wood", "hit", "impact", "land"])
add("kim", ["impactWood_heavy_000.ogg", "impactWood_heavy_002.ogg"], "wood_impact_heavy", ["wood", "impact", "heavy", "land", "low"])
add("kim", ["impactPlank_medium_000.ogg", "impactPlank_medium_002.ogg"], "wood_plank_drop", ["wood", "drop", "land", "impact"])
add("o100", ["wooden_01.ogg", "wooden_02.ogg"], "wood_block", ["wood", "hit", "tap", "drop"])
add("kim", ["impactMetal_light_000.ogg", "impactMetal_light_003.ogg"], "metal_tink", ["metal", "hit", "tap", "bright"])
add("kim", ["impactMetal_medium_000.ogg", "impactMetal_medium_003.ogg"], "metal_clang", ["metal", "hit", "impact"])
add("kim", ["impactMetal_heavy_000.ogg", "impactMetal_heavy_002.ogg"], "metal_impact_heavy", ["metal", "impact", "heavy"])
add("kim", ["impactTin_medium_000.ogg", "impactTin_medium_002.ogg"], "tin_hit", ["metal", "hit", "tap"])
add("kr", ["metalPot1.ogg", "metalPot3.ogg"], "metal_pot", ["metal", "hit", "impact", "heavy"])
add("kim", ["impactGlass_light_000.ogg", "impactGlass_light_002.ogg"], "glass_clink", ["glass", "hit", "tap", "bright"])
add("kim", ["impactGlass_medium_000.ogg", "impactGlass_medium_001.ogg"], "glass_knock", ["glass", "hit", "impact"])
add("kim", ["impactGlass_heavy_000.ogg", "impactGlass_heavy_001.ogg", "impactGlass_heavy_003.ogg"], "glass_break", ["glass", "break", "impact", "heavy"])
add("o100", ["glass_01.ogg", "glass_03.ogg", "glass_05.ogg"], "glass_shatter", ["glass", "break", "bright"])
add("kim", ["impactPlate_light_000.ogg", "impactPlate_light_002.ogg"], "ceramic_tap", ["hit", "tap", "ceramic", "bright"])
add("kim", ["impactPlate_heavy_000.ogg", "impactPlate_heavy_003.ogg"], "ceramic_smash", ["break", "impact", "ceramic", "heavy"])
add("kim", ["impactMining_000.ogg", "impactMining_002.ogg", "impactMining_004.ogg"], "stone_break", ["break", "hit", "stone", "impact"])
add("o100", ["slam_01.ogg", "slam_03.ogg"], "slam", ["impact", "heavy", "hit"])
add("o100", ["hit_01.ogg", "hit_03.ogg"], "hit_thump", ["hit", "impact"])
add("o100", ["gong_01.ogg"], "gong", ["gong", "metal", "low", "heavy", "win"])
add("kr", ["dropLeather.ogg"], "drop_bag", ["drop", "land", "soft", "low"])
add("kr", ["chop.ogg"], "wood_chop", ["wood", "hit", "break"])
add("kc", ["dice-throw-1.ogg", "dice-throw-3.ogg"], "dice_roll", ["dice", "roll", "bounce", "wood"])
add("kc", ["dice-shake-1.ogg"], "dice_shake", ["dice", "shake"])
add("o512", ["sfx_sounds_impact1.wav", "sfx_sounds_impact5.wav", "sfx_sounds_impact11.wav"], "hit_retro", ["hit", "impact", "retro", "8bit"])
add("o512", ["sfx_damage_hit3.wav", "sfx_damage_hit7.wav"], "damage_retro", ["hit", "damage", "negative", "retro", "8bit"])

# ---------------------------------------------------------------- bounce / jump / fall
add("o100", ["spring_01.ogg", "spring_02.ogg", "spring_03.ogg", "spring_04.ogg", "spring_06.ogg", "spring_08.ogg"], "spring_boing", ["bounce", "jump", "spring", "cartoon"])
add("kd", ["phaseJump1.ogg", "phaseJump2.ogg", "phaseJump3.ogg", "phaseJump5.ogg"], "jump_synth", ["jump", "bounce", "synth", "cartoon"])
add("o512", ["sfx_movement_jump1.wav", "sfx_movement_jump3.wav", "sfx_movement_jump11.wav", "sfx_movement_jump16.wav", "sfx_movement_jump19.wav"], "jump_retro", ["jump", "bounce", "retro", "8bit"])
add("o512", ["sfx_movement_jump12_landing.wav", "sfx_movement_jump17_landing.wav"], "land_retro", ["land", "drop", "retro", "8bit", "soft"])
add("o512", ["sfx_sounds_falling1.wav", "sfx_sounds_falling3.wav"], "fall_retro", ["fall", "drop", "whoosh", "retro", "8bit", "lose"])

# ---------------------------------------------------------------- explosions
add("ks", ["explosionCrunch_000.ogg", "explosionCrunch_001.ogg", "explosionCrunch_003.ogg", "explosionCrunch_004.ogg"], "explosion_crunch", ["explosion", "break", "heavy", "impact"])
add("ks", ["lowFrequency_explosion_000.ogg", "lowFrequency_explosion_001.ogg"], "explosion_boom_low", ["explosion", "heavy", "low", "impact"])
add("o100", ["explosion.ogg"], "explosion_small", ["explosion", "impact"])
add("o512", ["sfx_exp_short_soft2.wav", "sfx_exp_short_soft6.wav", "sfx_exp_short_hard2.wav", "sfx_exp_medium3.wav"], "explosion_retro", ["explosion", "retro", "8bit", "break"])

# ---------------------------------------------------------------- unlock / doors / misc
add("o100", ["key_open_01.ogg", "key_open_02.ogg"], "unlock_key", ["unlock", "key", "click", "metal"])
add("kr", ["metalLatch.ogg", "metalClick.ogg"], "unlock_latch", ["unlock", "click", "metal"])
add("o100", ["wooded_box_open.ogg"], "chest_open", ["unlock", "ui_open", "reward", "wood"])
add("kr", ["doorOpen_1.ogg"], "door_open_wood", ["ui_open", "door", "wood"])
add("kr", ["doorClose_1.ogg"], "door_close_wood", ["ui_close", "door", "wood", "heavy"])
add("ks", ["doorOpen_000.ogg"], "door_open_scifi", ["ui_open", "door", "whoosh", "scifi"])
add("ks", ["doorClose_001.ogg"], "door_close_scifi", ["ui_close", "door", "whoosh", "scifi"])
add("kd", ["zap1.ogg", "zap2.ogg"], "zap_electric", ["zap", "electric", "powerup", "synth"])
add("kd", ["laser1.ogg", "laser4.ogg", "laser7.ogg"], "laser_synth", ["laser", "shoot", "synth"])
add("ks", ["laserSmall_000.ogg", "laserSmall_002.ogg", "laserRetro_000.ogg", "laserRetro_003.ogg"], "laser_small", ["laser", "shoot", "scifi"])
add("ks", ["laserLarge_000.ogg", "laserLarge_002.ogg"], "laser_large", ["laser", "shoot", "scifi", "heavy"])
add("o512", ["sfx_sounds_Blip1.wav", "sfx_sounds_Blip5.wav", "sfx_sounds_Blip9.wav"], "blip_retro", ["tick", "countdown", "beep", "retro", "8bit"])
add("kd", ["tone1.ogg"], "beep_tone", ["tick", "countdown", "beep", "synth"])
add("o512", ["sfx_menu_move1.wav", "sfx_menu_move4.wav"], "ui_move_retro", ["tap", "click", "ui", "retro", "8bit"])
add("o512", ["sfx_menu_select1.wav", "sfx_menu_select2.wav"], "ui_select_retro", ["confirm", "select", "ui", "retro", "8bit"])
add("o512", ["sfx_sounds_pause1_in.wav"], "ui_pause_in_retro", ["ui_open", "pause", "ui", "retro", "8bit"])
add("o512", ["sfx_sounds_pause1_out.wav"], "ui_pause_out_retro", ["ui_close", "pause", "ui", "retro", "8bit"])
add("o512", ["sfx_alarm_loop1.wav"], "alarm_retro", ["alarm", "countdown", "warning", "retro", "8bit"])

# ---------------------------------------------------------------- music jingles / stingers
# Contour (start->end pitch, semitones) estimated by autocorrelation pitch tracking.
J = [
    ("Pizzicato jingles/jingles_PIZZI02.ogg", "jingle_pizzicato_win_01", ["jingle", "win", "fanfare", "reward", "cute", "cartoon"]),
    ("Pizzicato jingles/jingles_PIZZI10.ogg", "jingle_pizzicato_win_02", ["jingle", "win", "reward", "cute", "cartoon"]),
    ("Pizzicato jingles/jingles_PIZZI15.ogg", "jingle_pizzicato_win_03", ["jingle", "win", "level_up", "cute", "cartoon"]),
    ("Pizzicato jingles/jingles_PIZZI12.ogg", "jingle_pizzicato_neutral_01", ["jingle", "notify", "cute", "cartoon"]),
    ("Pizzicato jingles/jingles_PIZZI13.ogg", "jingle_pizzicato_neutral_02", ["jingle", "notify", "cute", "cartoon"]),
    ("Pizzicato jingles/jingles_PIZZI01.ogg", "jingle_pizzicato_lose_01", ["jingle", "lose", "fail", "cute", "cartoon"]),
    ("Pizzicato jingles/jingles_PIZZI14.ogg", "jingle_pizzicato_lose_02", ["jingle", "lose", "fail", "cute", "cartoon"]),
    ("Pizzicato jingles/jingles_PIZZI16.ogg", "jingle_pizzicato_lose_03", ["jingle", "lose", "fail", "cute", "cartoon"]),
    ("Steel jingles/jingles_STEEL10.ogg", "jingle_steeldrum_win_01", ["jingle", "win", "fanfare", "reward", "bright"]),
    ("Steel jingles/jingles_STEEL15.ogg", "jingle_steeldrum_win_02", ["jingle", "win", "level_up", "bright"]),
    ("Steel jingles/jingles_STEEL13.ogg", "jingle_steeldrum_neutral_01", ["jingle", "notify", "bright"]),
    ("Steel jingles/jingles_STEEL01.ogg", "jingle_steeldrum_lose_01", ["jingle", "lose", "fail"]),
    ("Steel jingles/jingles_STEEL12.ogg", "jingle_steeldrum_lose_02", ["jingle", "lose", "fail", "low"]),
    ("8-Bit jingles/jingles_NES12.ogg", "jingle_8bit_win_01", ["jingle", "win", "fanfare", "retro", "8bit"]),
    ("8-Bit jingles/jingles_NES09.ogg", "jingle_8bit_win_02", ["jingle", "win", "level_up", "retro", "8bit"]),
    ("8-Bit jingles/jingles_NES14.ogg", "jingle_8bit_win_03", ["jingle", "win", "retro", "8bit"]),
    ("8-Bit jingles/jingles_NES11.ogg", "jingle_8bit_lose_01", ["jingle", "lose", "fail", "retro", "8bit"]),
    ("8-Bit jingles/jingles_NES07.ogg", "jingle_8bit_lose_02", ["jingle", "lose", "fail", "retro", "8bit"]),
    ("Sax jingles/jingles_SAX02.ogg", "jingle_sax_win_01", ["jingle", "win", "fanfare", "reward"]),
    ("Sax jingles/jingles_SAX16.ogg", "jingle_sax_win_02", ["jingle", "win"]),
    ("Sax jingles/jingles_SAX01.ogg", "jingle_sax_lose_01", ["jingle", "lose", "fail"]),
    ("Hit jingles/jingles_HIT15.ogg", "stinger_hit_01", ["jingle", "stinger", "combo", "impact"]),
    ("Hit jingles/jingles_HIT03.ogg", "stinger_hit_02", ["jingle", "stinger", "combo", "impact"]),
    ("Hit jingles/jingles_HIT11.ogg", "stinger_hit_03", ["jingle", "stinger", "combo", "impact"]),
]
for f, i, t in J:
    S.append(("kj", f, i, t))

# ---------------------------------------------------------------- voice callouts
V = [
    ("Female/3.ogg", "voice_f_three", ["voice", "countdown", "three"]),
    ("Female/2.ogg", "voice_f_two", ["voice", "countdown", "two"]),
    ("Female/1.ogg", "voice_f_one", ["voice", "countdown", "one"]),
    ("Female/go.ogg", "voice_f_go", ["voice", "countdown", "go", "start"]),
    ("Female/ready.ogg", "voice_f_ready", ["voice", "countdown", "start"]),
    ("Female/set.ogg", "voice_f_set", ["voice", "countdown"]),
    ("Female/congratulations.ogg", "voice_f_congratulations", ["voice", "win", "reward"]),
    ("Female/you_win.ogg", "voice_f_you_win", ["voice", "win"]),
    ("Female/you_lose.ogg", "voice_f_you_lose", ["voice", "lose", "fail"]),
    ("Female/game_over.ogg", "voice_f_game_over", ["voice", "lose", "game_over"]),
    ("Female/level_up.ogg", "voice_f_level_up", ["voice", "level_up"]),
    ("Female/new_highscore.ogg", "voice_f_new_highscore", ["voice", "new_record", "win"]),
    ("Female/power_up.ogg", "voice_f_power_up", ["voice", "powerup"]),
    ("Female/time_over.ogg", "voice_f_time_over", ["voice", "lose", "timer"]),
    ("Female/hurry_up.ogg", "voice_f_hurry_up", ["voice", "warning", "timer"]),
    ("Female/correct.ogg", "voice_f_correct", ["voice", "confirm", "positive"]),
    ("Female/wrong.ogg", "voice_f_wrong", ["voice", "error", "fail"]),
    ("Female/final_round.ogg", "voice_f_final_round", ["voice", "start"]),
    ("Male/3.ogg", "voice_m_three", ["voice", "countdown", "three"]),
    ("Male/2.ogg", "voice_m_two", ["voice", "countdown", "two"]),
    ("Male/1.ogg", "voice_m_one", ["voice", "countdown", "one"]),
    ("Male/go.ogg", "voice_m_go", ["voice", "countdown", "go", "start"]),
    ("Male/you_win.ogg", "voice_m_you_win", ["voice", "win"]),
    ("Male/game_over.ogg", "voice_m_game_over", ["voice", "lose", "game_over"]),
    ("Male/new_highscore.ogg", "voice_m_new_highscore", ["voice", "new_record", "win"]),
    ("Male/level_up.ogg", "voice_m_level_up", ["voice", "level_up"]),
]
for f, i, t in V:
    S.append(("kv", f, i, t))


# ---------------------------------------------------------------- BGM
# (download path, id, mood, tags, loopable, bpm, title, author, page url, license, notes)
B = [
    ("bgm-happyvibes/ruskerdax_-_happy_vibes.mp3", "bgm_cheerful_happy_vibes", "cheerful", ["puzzle", "cute", "island", "synth", "light"], True, None,
     "Happy Vibes", "Ruskerdax", "https://opengameart.org/node/160228", "CC0", "Made for a puzzle game jam; loopable per author."),
    ("bgm-happyclappy/HappyClappyLoop.wav", "bgm_cheerful_happy_clappy", "cheerful", ["puzzle", "piano", "clap", "upbeat", "light"], True, None,
     "Happy Clappy Loop", "OwlishMedia", "https://opengameart.org/content/happy-clappy-loop", "CC0", "Loops seamlessly per author."),
    ("bgm-cozy/cozy.ogg", "bgm_cheerful_cozy_puzzle_title", "cheerful", ["puzzle", "menu", "title", "brass", "flute", "cozy"], True, 95,
     "Cozy Puzzle Title", "MintoDog", "https://opengameart.org/node/183286", "CC0", "Title music for puzzle game; loopable per author."),
    ("bgm-goodmorning/goodmorning.wav", "bgm_cheerful_good_morning", "cheerful", ["cute", "light", "morning", "menu"], True, None,
     "Good Morning", "Cakeflaps (You're Perfect Studio)", "https://opengameart.org/node/86566", "CC0",
     "Multi-licensed on OGA (CC-BY 4.0 / CC0 / OGA-BY 3.0); used here under the CC0 option. Loopable per author."),
    ("bgm-happymenu/pixelloop.mp3", "bgm_cheerful_happy_menu_short", "cheerful", ["menu", "short_loop", "light"], True, None,
     "Happy menu song", "Blocky Modeler", "https://opengameart.org/content/happy-menu-song", "CC0", "Short 12.8s loop."),
    ("bgm-happyadv/happy_adveture.mp3", "bgm_cheerful_happy_adventure_chiptune", "cheerful", ["chiptune", "retro", "8bit", "upbeat"], True, None,
     "Happy Adventure (Loop)", "TinyWorlds", "https://opengameart.org/content/happy-adventure-loop", "CC0", None),
    ("bgm-heckin/heckincrows.ogg", "bgm_cheerful_heckin_crows_chiptune", "cheerful", ["chiptune", "retro", "8bit", "arcade", "upbeat"], True, None,
     "Heckin' Crows", "congusbongus", "https://opengameart.org/content/heckin-crows", "CC0", "Arcade cart music; end level matches start (loop assumed, verify seam)."),
    ("bgm-heavenly/Heavenly_Loop.flac", "bgm_calm_heavenly_loop", "calm", ["menu", "ambient", "dreamy", "title"], True, None,
     "Heavenly Loop", "isaiah658", "https://opengameart.org/node/76208", "CC0", "Seamless loop per author."),
    ("bgm-slowstride/Slow_Stride_Loop.flac", "bgm_calm_slow_stride", "calm", ["menu", "chill", "smooth"], True, None,
     "Slow Stride", "isaiah658", "https://opengameart.org/content/slow-stride", "CC0", "Loop per author."),
    ("bgm-menuchill/menu_chill.wav", "bgm_calm_menu_chill", "calm", ["menu", "chill", "short_loop"], True, None,
     "Menu Chill Music", "etrock", "https://opengameart.org/content/menu-chill-music", "CC0", "Menu loop per author."),
    ("bgm-simplemenu/simple_loop.ogg", "bgm_calm_simple_menu_loop", "calm", ["menu", "background", "light"], True, None,
     "Simple menu/background music loop", "polosik", "https://opengameart.org/node/186484", "CC0", "Trailing 1.2s of silence trimmed."),
    ("bgm-upbeat/Upbeat_Loop_1.ogg", "bgm_energetic_upbeat_loop", "energetic", ["arcade", "upbeat", "gameplay"], True, None,
     "Upbeat short Music Loop", "BenjaTheMaker", "https://opengameart.org/node/54530", "CC0", None),
    ("bgm-headsand/headinthesand.ogg", "bgm_energetic_head_in_the_sand_chiptune", "energetic", ["arcade", "chiptune", "retro", "8bit", "upbeat"], True, None,
     "Head in the Sand (seamless loop)", "congusbongus", "https://opengameart.org/content/head-in-the-sand-seamless-loop", "CC0", "Seamless loop per author (mono source)."),
    ("bgm-arplands/the_arplands.wav", "bgm_energetic_arplands_8bit", "energetic", ["arcade", "chiptune", "8bit", "adventure", "upbeat"], True, None,
     "The Arplands", "LordZintick", "https://opengameart.org/content/the-arplands", "CC0", "Loopable per author."),
    ("bgm-fasttechno/fast_techno_action_loop.ogg", "bgm_energetic_fast_techno_loop", "energetic", ["arcade", "techno", "fast", "short_loop"], True, None,
     "Fast fun action techno loop 1", "annandistance", "https://opengameart.org/node/157883", "CC0", "Very short 6s loop."),
    ("bgm-awful/awfulgr8_1.wav", "bgm_tense_awful_great_action", "tense", ["action", "fast", "climax", "hurry"], False, None,
     "Awful great!", "iamoneabe", "https://opengameart.org/node/188882", "CC0", "Described as action loop but ends with fade-out; treat as non-seamless."),
    ("bgm-tension/tension_theme.wav", "bgm_tense_tension_theme", "tense", ["tension", "dramatic", "climax", "timer"], True, None,
     "Tension Theme", "umplix", "https://opengameart.org/content/tension-theme", "CC0", "Built from loops, exact 43.0s length; seam not verified by ear."),
    ("bgm-fight/fight.wav", "bgm_tense_fast_fight", "tense", ["battle", "fast", "boss", "climax"], False, None,
     "Fast fight / battle music", "bonsaiheldin", "https://opengameart.org/node/30344", "CC0", "Not seamless (community notes loop edit needed)."),
    ("music-jingles/x/Audio/Pizzicato jingles/jingles_PIZZI02.ogg", "bgm_victory_jingle_pizzicato", "victory", ["jingle", "win", "fanfare", "cute", "short"], False, None,
     "Music Jingles: PIZZI02", "Kenney", "https://kenney.nl/assets/music-jingles", "CC0", "Short ascending victory jingle (also usable as SFX)."),
    ("music-jingles/x/Audio/Steel jingles/jingles_STEEL02.ogg", "bgm_victory_jingle_steeldrum", "victory", ["jingle", "win", "fanfare", "bright", "short"], False, None,
     "Music Jingles: STEEL02", "Kenney", "https://kenney.nl/assets/music-jingles", "CC0", "Short ascending victory jingle (also usable as SFX)."),
]


# ---------------------------------------------------------------- curation pass 2
# Near-duplicates / weakest variants removed after loudness + duration review.
DROP = set("""
ui_switch_mech_02 ui_switch_mech_05 ui_switch_mech_06 ui_switch_mech_08
ui_click_soft_01 ui_click_03 ui_tap_short_04 ui_toggle_02 ui_toggle_04 ui_switch_02
ui_expand_03 ui_expand_04 ui_collapse_03 ui_collapse_04 ui_open_04 ui_close_04
ui_error_04 ui_error_05 ui_glass_tink_04 ui_glass_tink_05 ui_drop_bloop_04
pop_mouth_05 coin_retro_03 coin_retro_04 coin_retro_cluster_03 coin_retro_double_02
powerup_synth_02 powerup_synth_04 powerup_synth_06 powerup_retro_02 powerup_retro_04 powerup_retro_06
level_up_rise_04 pep_blip_04 whoosh_short_03 whoosh_medium_02 card_slide_04 card_place_02
thud_soft_03 thud_heavy_03 hit_light_03 punch_02 wood_plank_drop_02 wood_block_02
tin_hit_02 metal_pot_02 glass_knock_02 glass_break_03 glass_shatter_03 ceramic_tap_02 ceramic_smash_02
stone_break_03 hit_retro_03 damage_retro_02 spring_boing_02 spring_boing_05 jump_synth_04
jump_retro_04 jump_retro_05 land_retro_02 fall_retro_02 explosion_crunch_04 explosion_retro_03 explosion_retro_04
laser_synth_03 laser_small_02 laser_small_04 laser_large_02 blip_retro_03
jingle_sax_win_02 jingle_8bit_win_03 stinger_hit_03 jingle_pizzicato_neutral_02
voice_f_set voice_f_final_round voice_m_level_up voice_m_you_win
ui_hover_03 ui_back_03 ui_select_03 bell_hit_heavy_03 coin_stack_04 zap_electric_02 rise_phaser_04
ui_switch_mech_07 ui_scroll_ratchet_02 coin_handful_02 wood_tap_02 metal_tink_02 metal_clang_02
whoosh_long_02 slice_swish_02 tone_chime_04 bubbles_water_03
dice_roll_02 cloth_rustle_02 paper_rustle_02 page_flip_02 error_retro_03 ui_move_retro_02 ui_select_retro_02
""".split())
_ids = {s[2] for s in S}
assert DROP <= _ids, DROP - _ids
S = [s for s in S if s[2] not in DROP]
