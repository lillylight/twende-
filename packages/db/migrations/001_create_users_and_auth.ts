import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions = {
  id: {
    type: 'uuid',
    primaryKey: true,
    default: 'gen_random_uuid()',
  },
  createdAt: {
    type: 'timestamp',
    default: 'NOW()',
  },
  updatedAt: {
    type: 'timestamp',
    default: 'NOW()',
  },
};

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Users table
  pgm.createTable('users', {
    id: 'id',
    phone_number: { type: 'varchar(15)', notNull: true, unique: true },
    name: { type: 'varchar(255)', notNull: true },
    email: { type: 'varchar(255)' },
    user_type: {
      type: 'varchar(20)',
      notNull: true,
      check: "user_type IN ('passenger', 'driver', 'operator', 'rtsa_official')",
    },
    language: { type: 'varchar(3)', default: 'en' },
    password_hash: { type: 'varchar(255)' },
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    is_active: { type: 'boolean', default: true },
  });

  pgm.createIndex('users', 'phone_number');
  pgm.createIndex('users', 'user_type');

  // Emergency contacts table
  pgm.createTable('emergency_contacts', {
    id: 'id',
    passenger_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    name: { type: 'varchar(255)', notNull: true },
    phone_number: { type: 'varchar(15)', notNull: true },
    is_verified: { type: 'boolean', default: false },
    created_at: 'createdAt',
  });

  pgm.createIndex('emergency_contacts', 'passenger_id');

  // Operators table
  pgm.createTable('operators', {
    id: 'id',
    name: { type: 'varchar(255)', notNull: true },
    license_number: { type: 'varchar(100)', notNull: true, unique: true },
    contact_phone: { type: 'varchar(15)', notNull: true },
    contact_email: { type: 'varchar(255)' },
    compliance_score: {
      type: 'integer',
      default: 100,
      check: 'compliance_score >= 0 AND compliance_score <= 100',
    },
    is_active: { type: 'boolean', default: true },
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  });

  pgm.createIndex('operators', 'compliance_score');

  // Drivers table
  pgm.createTable('drivers', {
    id: 'id',
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    operator_id: {
      type: 'uuid',
      notNull: true,
      references: 'operators(id)',
      onDelete: 'CASCADE',
    },
    license_number: { type: 'varchar(100)', notNull: true, unique: true },
    performance_score: {
      type: 'integer',
      default: 100,
      check: 'performance_score >= 0 AND performance_score <= 100',
    },
    is_active: { type: 'boolean', default: true },
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  });

  pgm.createIndex('drivers', 'operator_id');
  pgm.createIndex('drivers', 'user_id');
}
