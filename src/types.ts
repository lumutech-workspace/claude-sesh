import { z } from 'zod';
import { oauthAccountSchema } from './claude-config.js';

export const profileMetadataSchema = z
  .object({
    name: z
      .string()
      .regex(/^[a-zA-Z0-9-]+$/, 'Use only letters, numbers, and hyphens in profile names.'),
    email: z.string().email().optional(),
    oauthAccount: oauthAccountSchema.optional(),
  })
  .strict();

export type ProfileMetadata = z.infer<typeof profileMetadataSchema>;

export type ProfileStatus = {
  kind: 'matched' | 'mismatch' | 'unregistered' | 'logged-out';
  profile: string;
  email: string;
};

export type CredentialStore = {
  get(name: string): Promise<string | null>;
  set(name: string, value: string): Promise<void>;
  list(): Promise<string[]>;
  remove(name: string): Promise<boolean>;
};
