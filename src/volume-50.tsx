import { setVolumePreset } from './volume-preset';

export default async function Command() {
  await setVolumePreset(50);
}
