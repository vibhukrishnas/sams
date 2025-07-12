import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('username').unique().notNullable();
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('pin_hash').nullable();
    table.string('first_name').nullable();
    table.string('last_name').nullable();
    table.enum('role', ['admin', 'operator', 'viewer']).defaultTo('viewer');
    table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
    table.json('permissions').nullable();
    table.json('preferences').nullable();
    table.string('phone').nullable();
    table.boolean('email_notifications').defaultTo(true);
    table.boolean('sms_notifications').defaultTo(false);
    table.boolean('push_notifications').defaultTo(true);
    table.string('firebase_token').nullable();
    table.timestamp('last_login').nullable();
    table.string('last_login_ip').nullable();
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('locked_until').nullable();
    table.boolean('two_factor_enabled').defaultTo(false);
    table.string('two_factor_secret').nullable();
    table.timestamps(true, true);
    
    // Indexes
    table.index(['username']);
    table.index(['email']);
    table.index(['role']);
    table.index(['status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
}
