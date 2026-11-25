import * as migration_20261028_154938_initial from './20261028_154938_initial';
import * as migration_20261104_122510_red_flags_email from './20261104_122510_red_flags_email';
import * as migration_20261105_195112_game_flow from './20261105_195112_game_flow';
import * as migration_20261105_205147_media_object_key from './20261105_205147_media_object_key';
import * as migration_20261121_181155_scenario_mode from './20261121_181155_scenario_mode';
import * as migration_20261123_144458_show_all_scenarios from './20261123_144458_show_all_scenarios';
import * as migration_20261123_150103_page_why_real from './20261123_150103_page_why_real';
import * as migration_20261125_110813_scam_only from './20261125_110813_scam_only';

export const migrations = [
  {
    up: migration_20261028_154938_initial.up,
    down: migration_20261028_154938_initial.down,
    name: '20261028_154938_initial',
  },
  {
    up: migration_20261104_122510_red_flags_email.up,
    down: migration_20261104_122510_red_flags_email.down,
    name: '20261104_122510_red_flags_email',
  },
  {
    up: migration_20261105_195112_game_flow.up,
    down: migration_20261105_195112_game_flow.down,
    name: '20261105_195112_game_flow',
  },
  {
    up: migration_20261105_205147_media_object_key.up,
    down: migration_20261105_205147_media_object_key.down,
    name: '20261105_205147_media_object_key',
  },
  {
    up: migration_20261121_181155_scenario_mode.up,
    down: migration_20261121_181155_scenario_mode.down,
    name: '20261121_181155_scenario_mode',
  },
  {
    up: migration_20261123_144458_show_all_scenarios.up,
    down: migration_20261123_144458_show_all_scenarios.down,
    name: '20261123_144458_show_all_scenarios',
  },
  {
    up: migration_20261123_150103_page_why_real.up,
    down: migration_20261123_150103_page_why_real.down,
    name: '20261123_150103_page_why_real',
  },
  {
    up: migration_20261125_110813_scam_only.up,
    down: migration_20261125_110813_scam_only.down,
    name: '20261125_110813_scam_only'
  },
];
