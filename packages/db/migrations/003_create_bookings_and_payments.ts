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
  // Bookings table
  pgm.createTable('bookings', {
    id: 'id',
    booking_reference: { type: 'varchar(20)', notNull: true, unique: true },
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
    seat_number: { type: 'integer', notNull: true },
    passenger_name: { type: 'varchar(255)', notNull: true },
    passenger_phone: { type: 'varchar(15)', notNull: true },
    amount: { type: 'decimal(10,2)', notNull: true },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'reserved',
      check: "status IN ('reserved', 'confirmed', 'cancelled', 'completed')",
    },
    qr_code: { type: 'text' },
    source: {
      type: 'varchar(10)',
      notNull: true,
      check: "source IN ('app', 'ussd')",
    },
    is_boarded: { type: 'boolean', default: false },
    boarded_at: { type: 'timestamp' },
    created_at: 'createdAt',
    expires_at: { type: 'timestamp' },
    confirmed_at: { type: 'timestamp' },
    cancelled_at: { type: 'timestamp' },
  });

  // Unique constraint for seat locking
  pgm.addConstraint('bookings', 'unique_journey_seat', {
    unique: ['journey_id', 'seat_number'],
  });

  pgm.createIndex('bookings', 'passenger_id');
  pgm.createIndex('bookings', 'journey_id');
  pgm.createIndex('bookings', 'booking_reference');
  pgm.createIndex('bookings', 'status');
  pgm.createIndex('bookings', 'expires_at', {
    where: "status = 'reserved'",
    using: 'btree',
  });

  // Payments table
  pgm.createTable('payments', {
    id: 'id',
    booking_id: {
      type: 'uuid',
      notNull: true,
      references: 'bookings(id)',
      onDelete: 'CASCADE',
    },
    amount: { type: 'decimal(10,2)', notNull: true },
    provider: {
      type: 'varchar(20)',
      notNull: true,
      check: "provider IN ('airtel_money', 'mtn_momo', 'zamtel_kwacha')",
    },
    phone_number: { type: 'varchar(15)', notNull: true },
    transaction_id: { type: 'varchar(255)' },
    provider_transaction_id: { type: 'varchar(255)' },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'pending',
      check: "status IN ('pending', 'initiated', 'success', 'failed', 'expired')",
    },
    failure_reason: { type: 'text' },
    created_at: 'createdAt',
    completed_at: { type: 'timestamp' },
    expires_at: { type: 'timestamp' },
  });

  pgm.createIndex('payments', 'booking_id');
  pgm.createIndex('payments', 'status');
  pgm.createIndex('payments', 'transaction_id');

  // Refunds table
  pgm.createTable('refunds', {
    id: 'id',
    booking_id: {
      type: 'uuid',
      notNull: true,
      references: 'bookings(id)',
      onDelete: 'CASCADE',
    },
    payment_id: {
      type: 'uuid',
      notNull: true,
      references: 'payments(id)',
      onDelete: 'CASCADE',
    },
    amount: { type: 'decimal(10,2)', notNull: true },
    cancellation_fee: { type: 'decimal(10,2)', default: 0 },
    net_refund: { type: 'decimal(10,2)', notNull: true },
    provider: { type: 'varchar(20)', notNull: true },
    transaction_id: { type: 'varchar(255)' },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'pending',
      check: "status IN ('pending', 'processing', 'completed', 'failed')",
    },
    created_at: 'createdAt',
    completed_at: { type: 'timestamp' },
  });

  pgm.createIndex('refunds', 'booking_id');
  pgm.createIndex('refunds', 'status');

  // Promotional codes table
  pgm.createTable('promotional_codes', {
    id: 'id',
    operator_id: {
      type: 'uuid',
      references: 'operators(id)',
      onDelete: 'CASCADE',
    },
    code: { type: 'varchar(20)', notNull: true, unique: true },
    discount_type: {
      type: 'varchar(10)',
      notNull: true,
      check: "discount_type IN ('percentage', 'fixed')",
    },
    discount_value: { type: 'decimal(10,2)', notNull: true },
    max_uses: { type: 'integer' },
    current_uses: { type: 'integer', default: 0 },
    valid_from: { type: 'timestamp', notNull: true },
    valid_until: { type: 'timestamp', notNull: true },
    created_at: 'createdAt',
  });

  pgm.createIndex('promotional_codes', 'code');
  pgm.createIndex('promotional_codes', 'operator_id');
}
