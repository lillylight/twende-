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
  // GPS data table
  pgm.createTable('gps_data', {
    id: { type: 'bigserial', primaryKey: true },
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
    vehicle_id: {
      type: 'uuid',
      notNull: true,
      references: 'vehicles(id)',
      onDelete: 'CASCADE',
    },
    latitude: { type: 'decimal(10,8)', notNull: true },
    longitude: { type: 'decimal(11,8)', notNull: true },
    speed: { type: 'decimal(5,2)', notNull: true },
    heading: { type: 'decimal(5,2)', notNull: true },
    accuracy: { type: 'decimal(6,2)' },
    is_buffered: { type: 'boolean', default: false },
    timestamp: { type: 'timestamp', notNull: true },
    created_at: 'createdAt',
  });

  pgm.createIndex('gps_data', ['journey_id', 'timestamp']);
  pgm.createIndex('gps_data', 'timestamp');
  pgm.createIndex('gps_data', 'created_at');

  // Safety violations table
  pgm.createTable('safety_violations', {
    id: 'id',
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
    vehicle_id: {
      type: 'uuid',
      notNull: true,
      references: 'vehicles(id)',
      onDelete: 'CASCADE',
    },
    operator_id: {
      type: 'uuid',
      notNull: true,
      references: 'operators(id)',
      onDelete: 'CASCADE',
    },
    violation_type: {
      type: 'varchar(20)',
      notNull: true,
      check: "violation_type IN ('speed', 'route_deviation')",
    },
    severity: {
      type: 'varchar(10)',
      notNull: true,
      check: "severity IN ('low', 'medium', 'high')",
    },
    latitude: { type: 'decimal(10,8)', notNull: true },
    longitude: { type: 'decimal(11,8)', notNull: true },
    details: { type: 'jsonb', notNull: true },
    points_deducted: { type: 'integer', notNull: true },
    is_resolved: { type: 'boolean', default: false },
    resolved_at: { type: 'timestamp' },
    created_at: 'createdAt',
  });

  pgm.createIndex('safety_violations', 'journey_id');
  pgm.createIndex('safety_violations', 'operator_id');
  pgm.createIndex('safety_violations', 'violation_type');
  pgm.createIndex('safety_violations', 'created_at');

  // SOS alerts table
  pgm.createTable('sos_alerts', {
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
    latitude: { type: 'decimal(10,8)', notNull: true },
    longitude: { type: 'decimal(11,8)', notNull: true },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'active',
      check: "status IN ('active', 'resolved', 'false_alarm')",
    },
    source: {
      type: 'varchar(10)',
      notNull: true,
      check: "source IN ('app', 'ussd')",
    },
    resolution_notes: { type: 'text' },
    triggered_at: { type: 'timestamp', default: 'NOW()' },
    resolved_at: { type: 'timestamp' },
  });

  pgm.createIndex('sos_alerts', 'passenger_id');
  pgm.createIndex('sos_alerts', 'journey_id');
  pgm.createIndex('sos_alerts', 'status');
  pgm.createIndex('sos_alerts', 'triggered_at');

  // Tracking links table
  pgm.createTable('tracking_links', {
    id: 'id',
    journey_id: {
      type: 'uuid',
      notNull: true,
      references: 'journeys(id)',
      onDelete: 'CASCADE',
    },
    passenger_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    token: { type: 'varchar(255)', notNull: true, unique: true },
    viewer_count: { type: 'integer', default: 0 },
    created_at: 'createdAt',
    expires_at: { type: 'timestamp', notNull: true },
  });

  pgm.createIndex('tracking_links', 'token');
  pgm.createIndex('tracking_links', 'journey_id');
  pgm.createIndex('tracking_links', 'expires_at');
}
