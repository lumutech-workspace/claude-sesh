import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { profileMetadataSchema, type ProfileMetadata } from './types.js';

const stateSchema = z.object({ activeProfile: z.string().optional(), profiles: z.array(profileMetadataSchema) });
export type State = z.infer<typeof stateSchema>;

export function createStateStore(directory: string) {
  const path = join(directory, 'state.json');
  const read = async (): Promise<State> => {
    try { return stateSchema.parse(JSON.parse(await readFile(path, 'utf8'))); }
    catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { profiles: [] };
      throw error;
    }
  };
  const save = async (state: State) => { await mkdir(directory, { recursive: true }); await writeFile(path, JSON.stringify(state, null, 2), 'utf8'); };
  return {
    read,
    async upsert(profile: ProfileMetadata) { const state = await read(); const profiles = state.profiles.filter(({ name }) => name !== profile.name); await save({ ...state, profiles: [...profiles, profile] }); },
    async setActive(activeProfile: string | undefined) { const state = await read(); await save({ ...state, activeProfile }); },
    async remove(name: string) { const state = await read(); await save({ activeProfile: state.activeProfile === name ? undefined : state.activeProfile, profiles: state.profiles.filter((profile) => profile.name !== name) }); },
  };
}
