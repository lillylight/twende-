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
};

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Compliance score history table
  pgm.createTable('compliance_history', {
    id: 'id',
    operator_id: {
      type: 'uuid',
      notNull: true,
      references: 'operators(id)',
      onDelete: 'CASCADE',
    },
    score: {
      type: 'integer',
      notNull: true,
      check: 'score >= 0 AND score <= 100',
    },
    change_amount: { type: 'integer', notNull: true },
    change_reason: { type: 'varchar(50)', notNull: true },
    violation_id: {
      type: 'uuid',
      references: 'safety_violations(id)',
      onDelete: 'SET NULL',
    },
    created_at: 'createdAt',
  });

  pgm.createIndex('compliance_history', ['operator_id', 'created_at']);

  // Ratings table
  pgm.createTable('ratings', {
    id: 'id',
    booking_id: {
      type: 'uuid',
      notNull: true,
      references: 'bookings(id)',
      onDelete: 'CASCADE',
    },
    passenger_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    journey_id: {
      type: 'uuid',
      notNull: true,
      references: 'journeys(id)',
      onDelete: 'CASCADE',
    },
    driver_id: {
      type: 'uuid',
      notNull: true,
      references: 'drivers(id)',
      onDelete: 'CASCADE',
    },
    operator_id: {
      type: 'uuid',
      notNull: true,
      references: 'operators(id)',
      onDelete: 'CASCADE',
    },
    rating: {
      type: 'integer',
      notNull: true,
      check: 'rating >= 1 AND rating <= 5',
    },
    feedback_text: { type: 'text' },
    feedback_categories: { type: 'jsonb' },
    created_at: 'createdAt',
  });

  pgm.createIndex('ratings', 'driver_id');
  pgm.createIndex('ratings', 'operator_id');
  pgm.createIndex('ratings', 'journey_id');

  // Incidents table
  pgm.createTable('incidents', {
    id: 'id',
    passenger_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    journey_id: {
      type: 'uuid',
      notNull: true,
      references: 'journeys(id)',
      onDelete: 'CASCADE',
    },
    incident_type: {
      type: 'varchar(50)',
      notNull: true,
      check:
        "incident_type IN ('safety_violation', 'driver_behavior', 'vehicle_condition', 'other')",
    },
    description: { type: 'text', notNull: true },
    photo_url: { type: 'text' },
    latitude: { type: 'decimal(10,8)' },
    longitude: { type: 'decimal(11,8)' },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'reported',
      check: "status IN ('reported', 'investigating', 'resolved')",
    },
    resolution_notes: { type: 'text' },
    reported_at: { type: 'timestamp', default: 'NOW()' },
    resolved_at: { type: 'timestamp' },
  });

  pgm.createIndex('incidents', 'journey_id');
  pgm.createIndex('incidents', 'status');
  pgm.createIndex('incidents', 'reported_at');

  // Audit logs table
  pgm.createTable('audit_logs', {
    id: { type: 'bigserial', primaryKey: true },
    user_id: { type: 'uuid', references: 'users(id)', onDelete: 'SET NULL' },
    user_type: { type: 'varchar(20)' },
    action: { type: 'varchar(100)', notNull: true },
    resource_type: { type: 'varchar(50)' },
    resource_id: { type: 'uuid' },
    details: { type: 'jsonb' },
    ip_address: { type: 'varchar(45)' },
    user_agent: { type: 'text' },
    created_at: { type: 'timestamp', default: 'NOW()' },
  });

  pgm.createIndex('audit_logs', 'user_id');
  pgm.createIndex('audit_logs', 'action');
  pgm.createIndex('audit_logs', 'created_at');

  // SMS logs table
  pgm.createTable('sms_logs', {
    id: 'id',
    phone_number: { type: 'varchar(15)', notNull: true },
    message: { type: 'text', notNull: true },
    operator: {
      type: 'varchar(20)',
      notNull: true,
      check: "operator IN ('airtel', 'mtn', 'zamtel')",
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'queued',
      check: "status IN ('queued', 'sent', 'delivered', 'failed')",
    },
    provider_message_id: { type: 'varchar(255)' },
    error_message: { type: 'text' },
    created_at: 'createdAt',
    sent_at: { type: 'timestamp' },
    delivered_at: { type: 'timestamp' },
  });

  pgm.createIndex('sms_logs', 'phone_number');
  pgm.createIndex('sms_logs', 'status');
  pgm.createIndex('sms_logs', 'created_at');
}
