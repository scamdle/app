import * as migration_20261028_154938_initial from './20261028_154938_initial';
import * as migration_20261104_122510_red_flags_email from './20261104_122510_red_flags_email';
import * as migration_20261105_195112_game_flow from './20261105_195112_game_flow';

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
    name: '20261105_195112_game_flow'
  },
];
