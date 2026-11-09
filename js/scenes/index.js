/* Every scene the page can mount, by the name used in data-scene / data-role. */
import { hero } from './hero.js';
import { education, snowflakeRole, habitLoop, arPhone, router, garage, hall } from './work.js';
import { studyBuddy, tutor } from './vip.js';
import { spotify, identifai, gopu, fog, book, squat } from './projects.js';
import { keyboard, plane } from './extras.js';
import { room } from './room.js';

export const registry = {
  hero, education, snowflakeRole, habitLoop, arPhone, router, garage, studyBuddy, tutor, hall,
  spotify, identifai, gopu, fog, book, squat, keyboard, plane, room,
};
