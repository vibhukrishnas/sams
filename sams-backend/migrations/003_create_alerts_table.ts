import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title').notNullable();
    table.text('message').notNullable();
    table.enum('severity', ['info', 'low', 'medium', 'high', 'critical']).notNullable();
    table.enum('type', ['threshold', 'anomaly', 'availability', 'security', 'custom']).notNullable();
    table.enum('status', ['active', 'acknowledged', 'resolved', 'suppressed']).defaultTo('active');
    table.enum('category', ['system', 'performance', 'application', 'security', 'network']).notNullable();
    table.string('source').notNullable(); // monitoring system that generated the alert
    table.uuid('server_id').references('id').inTable('servers').nullable();
    table.string('server_name').nullable(); // denormalized for performance
    table.uuid('rule_id').nullable(); // reference to alert rule
    table.string('metric_name').nullable();
    table.decimal('metric_value', 15, 4).nullable();
    table.decimal('threshold_value', 15, 4).nullable();
    table.json('metrics').nullable(); // additional metric data
    table.json('tags').nullable();
    table.json('labels').nullable();
    table.string('fingerprint').nullable(); // for deduplication
    table.integer('escalation_level').defaultTo(0);
    table.json('notifications_sent').nullable(); // array of notification types sent
    table.string('runbook_url').nullable();
    table.string('correlation_id').nullable(); // for grouping related alerts
    table.uuid('incident_id').nullable(); // reference to incident if escalated
    table.boolean('acknowledged').defaultTo(false);
    table.uuid('acknowledged_by').references('id').inTable('users').nullable();
    table.timestamp('acknowledged_at').nullable();
    table.text('acknowledgment_note').nullable();
    table.boolean('resolved').defaultTo(false);
    table.uuid('resolved_by').references('id').inTable('users').nullable();
    table.timestamp('resolved_at').nullable();
    table.text('resolution_note').nullable();
    table.timestamp('first_seen').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_seen').notNullable().defaultTo(knex.fn.now());
    table.integer('occurrence_count').defaultTo(1);
    table.timestamps(true, true);
    
    // Indexes
    table.index(['severity']);
    table.index(['status']);
    table.index(['type']);
    table.index(['category']);
    table.index(['server_id']);
    table.index(['acknowledged']);
    table.index(['resolved']);
    table.index(['first_seen']);
    table.index(['last_seen']);
    table.index(['fingerprint']);
    table.index(['correlation_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('alerts');
}
