import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('servers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('hostname').notNullable();
    table.string('ip_address').notNullable();
    table.integer('port').defaultTo(22);
    table.enum('type', ['web', 'database', 'application', 'load_balancer', 'cache', 'storage', 'other']).notNullable();
    table.enum('os', ['linux', 'windows', 'macos', 'other']).notNullable();
    table.string('os_version').nullable();
    table.enum('status', ['online', 'offline', 'maintenance', 'error']).defaultTo('offline');
    table.string('location').nullable();
    table.string('datacenter').nullable();
    table.string('environment').defaultTo('production'); // production, staging, development
    table.json('tags').nullable();
    table.json('metadata').nullable();
    table.json('credentials').nullable(); // encrypted
    table.string('agent_version').nullable();
    table.timestamp('last_seen').nullable();
    table.timestamp('last_heartbeat').nullable();
    table.boolean('monitoring_enabled').defaultTo(true);
    table.boolean('alerts_enabled').defaultTo(true);
    table.json('monitoring_config').nullable();
    table.decimal('cpu_cores', 8, 2).nullable();
    table.bigInteger('memory_gb').nullable();
    table.bigInteger('disk_gb').nullable();
    table.string('architecture').nullable(); // x86_64, arm64, etc.
    table.uuid('created_by').references('id').inTable('users').nullable();
    table.timestamps(true, true);
    
    // Indexes
    table.index(['hostname']);
    table.index(['ip_address']);
    table.index(['type']);
    table.index(['status']);
    table.index(['environment']);
    table.index(['last_seen']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('servers');
}
