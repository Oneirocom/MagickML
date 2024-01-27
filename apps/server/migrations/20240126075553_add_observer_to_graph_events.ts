import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('graphEvents', (table) => {
    table.string('observer').notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('graphEvents', (table) => {
    table.dropColumn('observer')
  })
}
