import * as migration_20261028_154938_initial from './20261028_154938_initial';
import * as migration_20261104_122510_red_flags_email from './20261104_122510_red_flags_email';

export const migrations = [
  {
    up: migration_20261028_154938_initial.up,
    down: migration_20261028_154938_initial.down,
    name: '20261028_154938_initial',
  },
  {
    up: migration_20261104_122510_red_flags_email.up,
    down: migration_20261104_122510_red_flags_email.down,
    name: '20261104_122510_red_flags_email'
  },
];
