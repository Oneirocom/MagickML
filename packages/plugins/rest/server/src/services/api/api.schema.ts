// DOCUMENTED 
import { resolve } from '@feathersjs/schema';
import { Type, getValidator } from '@feathersjs/typebox';
import type { Static } from '@feathersjs/typebox';

import type { HookContext } from '@magickml/server-core';
import { dataValidator, queryValidator } from '@magickml/server-core';

/**
 * Main data model schema
 */
export const apiSchema = Type.Object(
  {
    spellId: Type.String(),
    agentId: Type.String(),
    content: Type.String(),
    apiKey: Type.String(),
  },
  { $id: 'Api', additionalProperties: false },
);

export type Api = Static<typeof apiSchema>;
export const apiValidator = getValidator(apiSchema, dataValidator);
export const apiResolver = resolve<Api, HookContext>({});

export const apiExternalResolver = resolve<Api, HookContext>({});

/**
 * Schema for creating new entries
 */
export const apiDataSchema = Type.Pick(
  apiSchema,
  [
    'spellId',
    'agentId',
    'content',
    'apiKey',
  ],
  {
    $id: 'ApiData',
  },
);

export type ApiData = Static<typeof apiDataSchema>;
export const apiDataValidator = getValidator(apiDataSchema, dataValidator);
export const apiDataResolver = resolve<Api, HookContext>({});

/**
 * Schema for updating existing entries
 */
export const apiPatchSchema = Type.Partial(apiSchema, {
  $id: 'ApiPatch',
});

export type ApiPatch = Static<typeof apiPatchSchema>;
export const apiPatchValidator = getValidator(apiPatchSchema, dataValidator);
export const apiPatchResolver = resolve<Api, HookContext>({});

/**
 * Schema for allowed query properties
 */
export const apiQueryProperties = Type.Pick(apiSchema, [
  'agentId',
  'spellId',
  'content',
  'apiKey',
]);

export const apiQuerySchema = Type.Object(
  {
    agentId: Type.String(),
    spellId: Type.Optional(Type.String()),
    content: Type.String(),
    apiKey: Type.String(),
  },
  { additionalProperties: false },
);

export type ApiQuery = Static<typeof apiQuerySchema>;
export const apiQueryValidator = getValidator(apiQuerySchema, queryValidator);
export const apiQueryResolver = resolve<ApiQuery, HookContext>({});
