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
  // Vehicles table
  pgm.createTable('vehicles', {
    id: 'id',
    operator_id: {
      type: 'uuid',
      notNull: true,
      references: 'operators(id)',
      onDelete: 'CASCADE',
    },
    registration_number: { type: 'varchar(50)', notNull: true, unique: true },
    capacity: {
      type: 'integer',
      notNull: true,
      check: 'capacity > 0',
    },
    vehicle_type: { type: 'varchar(50)', notNull: true },
    is_wheelchair_accessible: { type: 'boolean', default: false },
    is_active: { type: 'boolean', default: true },
    under_maintenance: { type: 'boolean', default: false },
    total_distance_km: { type: 'decimal(10,2)', default: 0 },
    journey_count: { type: 'integer', default: 0 },
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  });

  pgm.createIndex('vehicles', 'operator_id');
  pgm.createIndex('vehicles', 'registration_number');

  // Routes table
  pgm.createTable('routes', {
    id: 'id',
    operator_id: {
      type: 'uuid',
      notNull: true,
      references: 'operators(id)',
      onDelete: 'CASCADE',
    },
    name: { type: 'varchar(255)', notNull: true },
    origin: { type: 'varchar(255)', notNull: true },
    destination: { type: 'varchar(255)', notNull: true },
    distance_km: { type: 'decimal(10,2)', notNull: true },
    route_type: {
      type: 'varchar(20)',
      notNull: true,
      check: "route_type IN ('urban', 'highway', 'mixed')",
    },
    waypoints: { type: 'jsonb', notNull: true, default: '[]' },
    speed_thresholds: { type: 'jsonb', notNull: true, default: '[]' },
    is_active: { type: 'boolean', default: true },
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  });

  pgm.createIndex('routes', 'operator_id');
  pgm.createIndex('routes', 'is_active');

  // Journeys table
  pgm.createTable('journeys', {
    id: 'id',
    route_id: {
      type: 'uuid',
      notNull: true,
      references: 'routes(id)',
      onDelete: 'CASCADE',
    },
    vehicle_id: {
      type: 'uuid',
      notNull: true,
      references: 'vehicles(id)',
      onDelete: 'CASCADE',
    },
    driver_id: {
      type: 'uuid',
      notNull: true,
      references: 'drivers(id)',
      onDelete: 'CASCADE',
    },
    scheduled_departure: { type: 'timestamp', notNull: true },
    scheduled_arrival: { type: 'timestamp', notNull: true },
    actual_departure: { type: 'timestamp' },
    actual_arrival: { type: 'timestamp' },
    base_price: { type: 'decimal(10,2)', notNull: true },
    current_price: { type: 'decimal(10,2)', notNull: true },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'scheduled',
      check: "status IN ('scheduled', 'active', 'completed', 'cancelled')",
    },
    passenger_count: { type: 'integer', default: 0 },
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  });

  pgm.createIndex('journeys', 'route_id');
  pgm.createIndex('journeys', 'vehicle_id');
  pgm.createIndex('journeys', 'driver_id');
  pgm.createIndex('journeys', 'status');
  pgm.createIndex('journeys', 'scheduled_departure');
}
