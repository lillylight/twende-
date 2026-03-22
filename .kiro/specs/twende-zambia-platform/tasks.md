# Implementation Plan: Twende Zambia Platform

## Overview

This implementation plan breaks down the Twende Zambia platform into discrete, incremental coding tasks. The platform is a comprehensive multi-platform transportation system with mobile apps (React Native), web dashboard (React.js + CesiumJS), backend services (Node.js/Express), and direct telecom integrations. Implementation follows a bottom-up approach: core infrastructure → data models → business logic → integrations → UI components → testing.

## Tasks

- [x] 1. Set up project infrastructure and core dependencies
  - Initialize monorepo structure with backend, passenger-app, driver-app, rtsa-dashboard, and shared packages
  - Configure TypeScript for all projects with strict mode enabled
  - Set up PostgreSQL database with connection pooling and migration framework (node-pg-migrate)
  - Set up Redis cluster configuration for caching and session management
  - Configure AWS SDK for S3, CloudWatch, and RDS integrations
  - Set up ESLint, Prettier, and Husky for code quality
  - Create Docker Compose configuration for local development environment
  - _Requirements: 29.1, 29.3, 29.4_

- [ ] 2. Implement database schema and migrations
  - [x] 2.1 Create core user and authentication tables
    - Write migration for users, emergency_contacts, operators, drivers tables
    - Add indexes for phone_number, user_type, operator_id lookups
    - Implement check constraints for user_type and language validation
    - _Requirements: 20.1, 20.2, 18.1_

  - [x] 2.2 Create vehicle and route management tables
    - Write migration for vehicles, routes, journeys tables
    - Add indexes for operator_id, route_id, status, scheduled_departure
    - Implement check constraints for capacity, route_type, journey status
    - _Requirements: 22.1, 15.1, 12.1_

  - [x] 2.3 Create booking and payment tables
    - Write migration for bookings, payments, refunds, promotional_codes tables
    - Add unique constraint on (journey_id, seat_number) for seat locking
    - Add indexes for booking_reference, passenger_id, status, expires_at
    - Implement check constraints for booking status, payment provider, discount types
    - _Requirements: 1.1, 3.1, 36.1_

  - [x] 2.4 Create GPS tracking and safety tables
    - Write migration for gps_data, safety_violations, sos_alerts tables
    - Add indexes for journey_id with timestamp DESC for efficient GPS queries
    - Implement partitioning strategy for gps_data by month
    - Add check constraints for violation_type, severity, sos status
    - _Requirements: 4.1, 6.1, 8.1_

  - [x] 2.5 Create compliance, ratings, and audit tables
    - Write migration for compliance_history, ratings, incidents, tracking_links tables
    - Add indexes for operator_id, driver_id, created_at for analytics queries
    - Write migration for audit_logs and sms_logs tables
    - Implement write-only access pattern for audit_logs
    - _Requirements: 11.1, 21.1, 28.1, 38.1_

  - [ ]\* 2.6 Write property test for database schema constraints
    - **Property 33: Vehicle Registration Uniqueness**
    - **Validates: Requirements 22.2**

- [x] 3. Implement Redis data structures and caching layer
  - Create Redis client wrapper with connection pooling and error handling
  - Implement USSD session management with 60-second TTL
  - Implement JWT token blacklist with 24-hour TTL
  - Implement rate limiting counters for IP and user-based limits
  - Implement journey position cache with hash structure
  - Implement WebSocket room tracking with sets
  - Implement booking reservation locks with 10-minute TTL
  - _Requirements: 2.5, 20.5, 25.1, 25.6, 1.2_

- [x] 4. Implement core booking module
  - [x] 4.1 Create booking service with seat availability logic
    - Implement getAvailableSeats function querying bookings table
    - Implement createBooking function with Redis-based seat locking
    - Implement 10-minute reservation timeout with expires_at timestamp
    - Generate unique booking reference using alphanumeric codes
    - _Requirements: 1.1, 1.2_

  - [x] 4.2 Implement booking confirmation and QR code generation
    - Implement confirmBooking function updating status to confirmed
    - Generate QR codes using qrcode library with booking reference
    - Store QR code URLs in S3 bucket
    - Update booking record with qrCode field
    - _Requirements: 1.4, 14.1, 14.2_

  - [ ]\* 4.3 Write property test for booking cancellation round-trip
    - **Property 1: Booking Cancellation Round-Trip**
    - **Validates: Requirements 1.7**

  - [x] 4.4 Implement booking cancellation and refund logic
    - Implement cancelBooking function checking 2-hour cancellation window
    - Calculate refund amount as 90% of original payment (10% cancellation fee)
    - Update booking status to cancelled
    - Release seat by removing reservation lock
    - _Requirements: 1.6, 1.3_

  - [ ]\* 4.5 Write property test for seat reservation timeout
    - **Property 8: Seat Reservation Timeout Release**
    - **Validates: Requirements 1.3**

  - [x] 4.6 Implement booking modification and seat changes
    - Implement modifyBooking function for seat changes
    - Calculate price difference for seat upgrades/downgrades
    - Implement seat change pricing logic (same price, higher, lower)
    - Restrict seat changes to 1 hour before departure
    - _Requirements: 31.1, 31.2, 31.3, 31.4, 31.5_

  - [ ]\* 4.7 Write property test for seat change pricing logic
    - **Property 36: Seat Change Pricing Logic**
    - **Validates: Requirements 31.2, 31.3, 31.4**

  - [x] 4.8 Implement QR code validation and boarding
    - Implement validateQRCode function decoding QR data
    - Verify booking status is confirmed and not expired
    - Mark passenger as boarded with is_boarded flag and timestamp
    - Prevent duplicate boarding by checking is_boarded status
    - _Requirements: 14.4, 14.5, 14.6, 14.7_

  - [ ]\* 4.9 Write property tests for QR code validation
    - **Property 7: QR Code Round-Trip Integrity**
    - **Property 26: Invalid QR Code Rejection**
    - **Property 27: Duplicate Boarding Prevention**
    - **Validates: Requirements 14.8, 14.6, 14.7**

  - [x] 4.10 Implement background job for releasing expired reservations
    - Create Bull queue for scheduled jobs
    - Implement releaseExpiredReservations job running every minute
    - Query bookings with status=reserved and expires_at < NOW()
    - Update status to cancelled and remove Redis locks
    - _Requirements: 1.3_

- [ ] 5. Checkpoint - Verify booking module functionality
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement payment module with mobile money integrations
  - [x] 6.1 Create payment provider abstraction layer
    - Define PaymentProvider interface with initiatePayment, checkStatus, processRefund methods
    - Implement AirtelMoneyProvider with Airtel Money API integration
    - Implement MTNMoMoProvider with MTN MoMo API integration
    - Implement ZamtelKwachaProvider with Zamtel Kwacha API integration
    - Implement provider factory for selecting provider based on phone number
    - _Requirements: 3.1, 3.5_

  - [x] 6.2 Implement mobile network detection
    - Create phone number parser for Zambian mobile numbers
    - Implement network detection logic (Airtel: 097/077, MTN: 096/076, Zamtel: 095/075)
    - Return appropriate MobileMoneyProvider based on phone prefix
    - _Requirements: 3.1_

  - [ ]\* 6.3 Write property test for mobile network detection
    - **Property 11: Mobile Network Detection Accuracy**
    - **Validates: Requirements 3.1**

  - [x] 6.4 Implement payment initiation and callback handling
    - Implement initiatePayment function creating payment record with status=pending
    - Send payment request to mobile money provider API
    - Update payment status to initiated and store provider transaction ID
    - Implement handlePaymentCallback processing provider webhooks
    - Update payment status to success/failed based on callback
    - Trigger booking confirmation on successful payment
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 6.5 Implement refund processing
    - Implement processRefund function calculating net refund amount
    - Create refund record with cancellation fee deduction
    - Send refund request to mobile money provider API
    - Update refund status based on provider response
    - _Requirements: 1.6, 3.6_

  - [ ]\* 6.6 Write property test for payment amount conservation
    - **Property 2: Payment Amount Conservation**
    - **Validates: Requirements 3.8, 24.7**

  - [x] 6.7 Implement payment reconciliation
    - Implement reconcileTransactions function comparing platform records with provider statements
    - Flag discrepancies for manual review
    - Generate daily reconciliation reports
    - Calculate operator revenue after 5% platform commission
    - _Requirements: 24.1, 24.2, 24.3, 24.5_

  - [x] 6.8 Implement payment retry logic and error handling
    - Implement exponential backoff for failed payment requests (3 attempts)
    - Maintain seat reservation during payment retries
    - Log all payment transactions with timestamps and transaction IDs
    - Handle payment provider timeouts gracefully
    - _Requirements: 3.7_

- [ ] 7. Implement GPS tracking module
  - [x] 7.1 Create GPS data ingestion endpoint
    - Implement receiveGPSData REST endpoint accepting GPS data from driver app
    - Validate GPS data structure (latitude, longitude, speed, heading, accuracy, timestamp)
    - Insert GPS data into gps_data table
    - Update Redis journey position cache
    - _Requirements: 4.1, 4.5_

  - [x] 7.2 Implement buffered GPS data batch processing
    - Implement receiveBufferedGPSData endpoint accepting array of GPS data
    - Validate chronological order of buffered data
    - Bulk insert GPS data maintaining timestamp order
    - Mark data as buffered with is_buffered flag
    - _Requirements: 4.4, 13.4_

  - [ ]\* 7.3 Write property test for GPS chronological order preservation
    - **Property 3: GPS Data Chronological Order Preservation**
    - **Validates: Requirements 4.8**

  - [x] 7.4 Implement current position retrieval
    - Implement getCurrentPosition function querying Redis cache first
    - Fallback to database query for latest GPS data if cache miss
    - Return null if no GPS data exists for journey
    - _Requirements: 5.1_

  - [x] 7.5 Implement tracking link generation and validation
    - Implement generateTrackingLink creating unique token with crypto.randomBytes
    - Store tracking link in tracking_links table with journey_id and expiry
    - Set expiry to journey end time plus 2 hours
    - Implement validateTrackingLink verifying token and checking expiry
    - Increment viewer_count on successful validation
    - _Requirements: 19.1, 19.3_

  - [ ]\* 7.6 Write property test for tracking link viewer limit
    - **Property 32: Tracking Link Viewer Limit**
    - **Validates: Requirements 19.7**

- [x] 8. Implement WebSocket server for real-time communication
  - [x] 8.1 Set up Socket.io server with authentication
    - Initialize Socket.io server with CORS configuration
    - Implement JWT-based WebSocket authentication middleware
    - Create journey-specific rooms for position broadcasting
    - Track connected clients in Redis sets
    - _Requirements: 16.1, 16.5_

  - [x] 8.2 Implement position broadcasting
    - Implement broadcastPosition function emitting to journey room
    - Broadcast GPS data to all connected passengers within 1 second
    - Update Redis journey position cache before broadcasting
    - _Requirements: 5.2, 16.2_

  - [ ] 8.3 Implement WebSocket connection management
    - Implement connection limit of 3 concurrent connections per passenger
    - Implement automatic reconnection with exponential backoff (max 5 attempts)
    - Close connections when journey ends
    - Handle disconnections and remove from Redis tracking
    - _Requirements: 16.4, 16.6, 16.7_

  - [ ]\* 8.4 Write property test for WebSocket connection limit
    - **Property 31: WebSocket Connection Limit**
    - **Validates: Requirements 16.7**

  - [ ] 8.5 Implement safety alert broadcasting
    - Implement broadcastSafetyAlert function emitting to journey room
    - Broadcast speed violations and route deviations immediately
    - Include alert details (type, severity, location, timestamp)
    - _Requirements: 6.2, 7.2, 16.3_

- [ ] 9. Implement safety monitoring module
  - [ ] 9.1 Implement speed violation detection
    - Implement detectSpeedViolation function comparing GPS speed with route speed thresholds
    - Use 80 km/h threshold for urban routes, 100 km/h for highway routes
    - Create safety_violations record when speed exceeds threshold
    - Calculate excess speed and determine severity (low: <10 km/h, medium: 10-20 km/h, high: >20 km/h)
    - _Requirements: 6.1, 6.5_

  - [ ]\* 9.2 Write property test for speed violation detection
    - **Property 14: Speed Violation Detection**
    - **Validates: Requirements 6.1**

  - [ ] 9.3 Implement route deviation detection
    - Implement detectRouteDeviation function calculating distance from route path
    - Use PostGIS ST_Distance for geographic distance calculation
    - Detect deviation when distance exceeds 500 meters
    - Check for planned detours before creating violation
    - Calculate deviation duration and distance
    - _Requirements: 7.1, 7.4_

  - [ ]\* 9.4 Write property test for route deviation detection
    - **Property 16: Route Deviation Detection Threshold**
    - **Property 17: Planned Detour Suppression**
    - **Validates: Requirements 7.1, 7.4**

  - [ ] 9.5 Implement safety alert processing
    - Implement processSafetyAlert function creating violation records
    - Broadcast alerts to passengers via WebSocket
    - Send push notifications to all passengers on journey
    - Notify RTSA dashboard in real-time
    - Escalate to operator for multiple violations within 10 minutes
    - _Requirements: 6.2, 6.3, 6.4, 6.6_

  - [ ] 9.6 Implement planned detour management
    - Implement markPlannedDetour function storing detour information
    - Associate detour with journey_id and route segment
    - Suppress route deviation alerts for marked segments
    - _Requirements: 7.4, 7.5_

  - [ ] 9.7 Integrate safety monitoring with GPS ingestion
    - Call checkSafetyViolations after each GPS data point is received
    - Run speed and route deviation checks in parallel
    - Process alerts asynchronously to avoid blocking GPS ingestion
    - _Requirements: 6.1, 7.1_

  - [ ]\* 9.8 Write property test for speed violation logging
    - **Property 4: Speed Violation Logging Completeness**
    - **Validates: Requirements 6.8**

- [ ] 10. Implement compliance scoring module
  - [ ] 10.1 Create compliance scorer with point deduction logic
    - Implement calculateComplianceScore function querying current operator score
    - Initialize new operators with score of 100
    - Implement deductPoints function for safety violations
    - Deduct 2 points for speed violations, 5 for route deviations, 10 for unresolved SOS
    - Ensure score never goes below 0
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]\* 10.2 Write property test for compliance score bounds
    - **Property 5: Compliance Score Bounds Invariant**
    - **Validates: Requirements 11.9**

  - [ ]\* 10.3 Write property test for violation score deduction
    - **Property 15: Speed Violation Point Deduction**
    - **Property 20: Violation Score Deduction by Severity**
    - **Validates: Requirements 6.7, 11.3**

  - [ ] 10.4 Implement daily score increment for violation-free operation
    - Implement incrementDailyScore function adding 1 point per day
    - Cap score at maximum of 100
    - Create background job running daily to increment scores
    - Query operators with no violations in past 24 hours
    - _Requirements: 11.5_

  - [ ]\* 10.5 Write property test for compliance score recovery cap
    - **Property 21: Compliance Score Recovery Cap**
    - **Validates: Requirements 11.5**

  - [ ] 10.6 Implement operator flagging logic
    - Implement getFlaggedOperators function querying operators by score
    - Flag operators with score < 70 for review
    - Flag operators with score < 50 for suspension recommendation
    - _Requirements: 11.6, 11.7_

  - [ ] 10.7 Implement compliance history tracking
    - Create compliance_history record for each score change
    - Store change_amount, change_reason, and violation_id
    - Implement getScoreHistory function for trend analysis
    - _Requirements: 11.8_

  - [ ] 10.8 Integrate compliance scorer with safety monitoring
    - Call deductPoints after each safety violation is created
    - Update operators table with new compliance_score
    - Create compliance_history record
    - _Requirements: 6.7, 7.7_

- [ ] 11. Checkpoint - Verify safety and compliance modules
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement SOS emergency system
  - [ ] 12.1 Create SOS alert triggering logic
    - Implement triggerSOS function creating sos_alerts record with status=active
    - Store passenger location, journey details, and timestamp
    - Retrieve passenger's verified emergency contacts
    - _Requirements: 8.1, 8.4_

  - [ ] 12.2 Implement SOS notification dispatch
    - Send SMS to all verified emergency contacts with location and journey details
    - Notify RTSA dashboard via WebSocket with real-time alert
    - Broadcast alert to all passengers on same journey
    - Include GPS coordinates, passenger name, and bus details in notifications
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]\* 12.3 Write property test for SOS emergency contact notification
    - **Property 18: SOS Emergency Contact Notification**
    - **Validates: Requirements 8.1**

  - [ ] 12.4 Implement continuous location tracking during SOS
    - Increase GPS tracking frequency to every 2 seconds during active SOS
    - Broadcast location updates to emergency contacts and RTSA
    - Continue tracking until SOS is resolved
    - _Requirements: 8.5_

  - [ ] 12.5 Implement SOS resolution and false alarm handling
    - Implement resolveSOSAlert function updating status to resolved
    - Send confirmation notifications to all previously notified parties
    - Implement cancelFalseAlarm function for accidental triggers
    - Allow cancellation within 2 minutes of activation
    - _Requirements: 8.7, 8.8, 9.5_

  - [ ] 12.6 Implement SOS confirmation to prevent accidental triggers
    - Add confirmation step before activating SOS in app
    - Display warning message about emergency notification
    - _Requirements: 8.6_

  - [ ] 12.7 Integrate SOS with compliance scoring
    - Deduct 10 points from operator compliance score for unresolved SOS events
    - Track SOS resolution time in compliance metrics
    - _Requirements: 11.4_

- [ ] 13. Implement SMS service with direct telecom integration
  - [ ] 13.1 Create SMS provider abstraction layer
    - Define SMSProvider interface with sendSMS and checkDeliveryStatus methods
    - Implement AirtelSMSProvider with Airtel SMS gateway API
    - Implement MTNSMSProvider with MTN SMS gateway API
    - Implement ZamtelSMSProvider with Zamtel SMS gateway API
    - Implement provider factory auto-detecting operator from phone number
    - _Requirements: 17.6, 23.2_

  - [ ] 13.2 Implement SMS message queuing with Bull
    - Create Bull queue for SMS messages with priority support
    - Implement sendSMS function queuing messages for delivery
    - Implement worker processing queued messages
    - Retry failed messages with exponential backoff
    - _Requirements: 17.6_

  - [ ] 13.3 Implement SMS delivery tracking
    - Create sms_logs record for each message with status=queued
    - Update status to sent after successful API call
    - Implement handleDeliveryReport processing provider callbacks
    - Update status to delivered/failed based on delivery reports
    - _Requirements: 17.7_

  - [ ] 13.4 Implement multi-language SMS support
    - Create message templates for English, Bemba, and Nyanja
    - Select template based on user's language preference
    - Support variable substitution in templates (booking reference, journey details)
    - _Requirements: 17.2, 27.6_

  - [ ] 13.5 Implement SMS notifications for booking lifecycle
    - Send booking confirmation SMS with reference and QR code link
    - Send journey reminder SMS 30 minutes before departure
    - Send safety alert SMS during violations
    - Send journey cancellation SMS with refund information
    - Send refund confirmation SMS with transaction details
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 14. Implement USSD service with session management
  - [ ] 14.1 Create USSD session manager with Redis
    - Implement getSession function retrieving or creating USSD sessions
    - Store session state in Redis with 60-second TTL
    - Implement updateSession function persisting state changes
    - Support session resumption within 5 minutes
    - _Requirements: 2.5_

  - [ ] 14.2 Implement USSD menu system
    - Create menu tree structure for booking, tracking, and SOS options
    - Implement handleUSSDRequest function routing to appropriate menu handler
    - Implement processMenuSelection function updating session state
    - Display error message and re-prompt for invalid menu options
    - _Requirements: 2.1, 2.6_

  - [ ]\* 14.3 Write property test for USSD invalid input handling
    - **Property 10: USSD Invalid Input Error Handling**
    - **Validates: Requirements 2.6**

  - [ ] 14.4 Implement USSD booking flow
    - Implement startBookingFlow function guiding through route, date, time, seat selection
    - Display numbered menus for each selection step
    - Store booking data in session state
    - Initiate mobile money payment prompt after seat selection
    - Send booking confirmation SMS with reference code
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ] 14.5 Implement USSD SOS flow
    - Implement startSOSFlow function requesting confirmation
    - Trigger SOS system with phone number and last known location
    - Send immediate SMS confirmation with emergency contact details
    - Provide follow-up menu for canceling false alarms within 2 minutes
    - Use cell tower triangulation when GPS unavailable
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 14.6 Implement multi-language support for USSD
    - Display language selection in main menu
    - Store language preference in session state
    - Render all menus in selected language (English, Bemba, Nyanja)
    - _Requirements: 2.7, 27.5_

  - [ ] 14.7 Integrate USSD with direct telecom operator APIs
    - Implement Airtel USSD gateway integration
    - Implement MTN USSD gateway integration
    - Implement Zamtel USSD gateway integration
    - Handle operator-specific request/response formats (XML/JSON)
    - Use ZICTA-assigned short code \*147#
    - _Requirements: 23.1, 23.2_

- [ ] 15. Implement route and journey management
  - [ ] 15.1 Create route management service
    - Implement createRoute function validating origin, destination, waypoints, distance
    - Validate waypoints form continuous path using geographic distance checks
    - Calculate speed thresholds for each route segment based on road type
    - Store route data with waypoints as JSONB array
    - _Requirements: 15.1, 15.2, 15.7_

  - [ ]\* 15.2 Write property test for route waypoint continuity
    - **Property 28: Route Waypoint Continuity Validation**
    - **Validates: Requirements 15.2**

  - [ ] 15.3 Implement journey scheduling
    - Implement createJourney function requiring route, vehicle, driver, departure/arrival times
    - Validate vehicle is not assigned to overlapping journey
    - Set initial status to scheduled
    - Calculate base_price and current_price
    - _Requirements: 15.3, 15.4_

  - [ ]\* 15.4 Write property test for vehicle schedule conflict prevention
    - **Property 29: Vehicle Schedule Conflict Prevention**
    - **Property 34: Vehicle Double-Booking Prevention**
    - **Validates: Requirements 15.4, 22.3**

  - [ ] 15.5 Implement journey lifecycle management
    - Implement startJourney function updating status to active
    - Validate journey cannot start more than 30 minutes before scheduled departure
    - Notify all booked passengers via SMS and push notification
    - Implement endJourney function updating status to completed
    - Record actual_departure and actual_arrival timestamps
    - _Requirements: 12.2, 12.3, 12.4_

  - [ ]\* 15.6 Write property test for journey start time restriction
    - **Property 22: Journey Start Time Restriction**
    - **Validates: Requirements 12.5**

  - [ ] 15.7 Implement route update notifications
    - Notify all passengers with future bookings when route is updated
    - Send SMS and push notifications with route change details
    - _Requirements: 15.5_

- [ ] 16. Implement vehicle and fleet management
  - [ ] 16.1 Create vehicle management service
    - Implement addVehicle function requiring registration, capacity, vehicle type
    - Validate registration number uniqueness
    - Associate vehicle with operator
    - Track wheelchair accessibility flag
    - _Requirements: 22.1, 22.2, 37.6_

  - [ ] 16.2 Implement vehicle assignment validation
    - Verify vehicle is not assigned to overlapping journey
    - Check vehicle is not under maintenance
    - Validate vehicle is active
    - _Requirements: 22.3, 22.5_

  - [ ] 16.3 Implement vehicle performance tracking
    - Track total_distance_km and journey_count for each vehicle
    - Update metrics after each completed journey
    - Calculate vehicle utilization (active hours, revenue per vehicle)
    - _Requirements: 22.4, 22.6_

  - [ ] 16.4 Implement vehicle safety flagging
    - Query safety_violations count per vehicle in past 30 days
    - Flag vehicles with 5 or more violations for inspection
    - _Requirements: 22.7_

  - [ ] 16.5 Implement wheelchair accessibility filtering
    - Filter vehicles by is_wheelchair_accessible flag
    - Display only accessible vehicles when passenger requests accessibility
    - _Requirements: 37.4, 37.5_

  - [ ]\* 16.6 Write property test for wheelchair accessibility filtering
    - **Property 39: Wheelchair Accessibility Filtering**
    - **Validates: Requirements 37.5**

- [ ] 17. Implement driver management and authentication
  - [ ] 17.1 Create driver authentication service
    - Implement driver login with phone number and password
    - Verify driver has valid license number and operator association
    - Issue JWT token valid for 24 hours
    - Store token securely in Redis with user context
    - _Requirements: 20.1, 20.2, 20.3_

  - [ ] 17.2 Implement driver authorization middleware
    - Verify JWT token on protected endpoints
    - Check driver account is active
    - Allow operators to deactivate driver accounts
    - Revoke all active tokens when account is deactivated
    - _Requirements: 20.5, 20.6, 20.7_

  - [ ] 17.3 Implement driver performance tracking
    - Track safety violations, on-time performance, passenger ratings per driver
    - Calculate driver performance score (40% safety, 30% on-time, 30% ratings)
    - Generate monthly driver performance reports
    - Flag drivers with score < 60 for retraining
    - _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5_

  - [ ] 17.4 Implement authentication audit logging
    - Log all driver authentication attempts with timestamps, IP addresses, user agents
    - Store logs in audit_logs table
    - _Requirements: 20.8, 28.1_

- [ ] 18. Checkpoint - Verify core backend services
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Implement REST API endpoints
  - [ ] 19.1 Create authentication and user management endpoints
    - POST /api/auth/login - User authentication
    - POST /api/auth/register - User registration
    - POST /api/auth/logout - Token revocation
    - GET /api/users/profile - Get user profile
    - PUT /api/users/profile - Update user profile
    - POST /api/users/emergency-contacts - Add emergency contact
    - DELETE /api/users/emergency-contacts/:id - Remove emergency contact
    - _Requirements: 20.1, 18.1, 18.4_

  - [ ] 19.2 Create booking management endpoints
    - GET /api/journeys/:id/seats - Get available seats
    - POST /api/bookings - Create booking
    - GET /api/bookings/:id - Get booking details
    - PUT /api/bookings/:id/cancel - Cancel booking
    - PUT /api/bookings/:id/modify - Modify booking
    - POST /api/bookings/:id/validate-qr - Validate QR code
    - GET /api/bookings/history - Get passenger booking history
    - _Requirements: 1.1, 1.2, 1.6, 31.1, 14.4, 34.1_

  - [ ] 19.3 Create payment endpoints
    - POST /api/payments/initiate - Initiate payment
    - GET /api/payments/:id/status - Check payment status
    - POST /api/payments/callback/:provider - Handle payment callbacks
    - _Requirements: 3.2, 3.3_

  - [ ] 19.4 Create GPS tracking endpoints
    - POST /api/tracking/gps - Receive GPS data
    - POST /api/tracking/gps/batch - Receive buffered GPS data
    - GET /api/tracking/journeys/:id/position - Get current position
    - POST /api/tracking/links - Generate tracking link
    - GET /api/tracking/links/:token - Validate tracking link
    - _Requirements: 4.1, 4.4, 5.4, 19.1, 19.2_

  - [ ] 19.5 Create SOS and safety endpoints
    - POST /api/sos/trigger - Trigger SOS alert
    - PUT /api/sos/:id/resolve - Resolve SOS alert
    - PUT /api/sos/:id/cancel - Cancel false alarm
    - GET /api/sos/active - Get active SOS alerts
    - POST /api/safety/detours - Mark planned detour
    - _Requirements: 8.1, 8.8, 9.5, 7.5_

  - [ ] 19.6 Create route and journey endpoints
    - GET /api/routes - List routes
    - POST /api/routes - Create route (operator only)
    - PUT /api/routes/:id - Update route (operator only)
    - GET /api/journeys - Search journeys
    - POST /api/journeys - Create journey (operator only)
    - PUT /api/journeys/:id/start - Start journey (driver only)
    - PUT /api/journeys/:id/end - End journey (driver only)
    - _Requirements: 15.1, 15.3, 12.2, 12.4_

  - [ ] 19.7 Create operator and fleet management endpoints
    - GET /api/operators/:id/dashboard - Get operator dashboard
    - GET /api/operators/:id/analytics - Get operator analytics
    - POST /api/vehicles - Add vehicle
    - PUT /api/vehicles/:id - Update vehicle
    - GET /api/vehicles/:id/performance - Get vehicle performance
    - GET /api/drivers/:id/performance - Get driver performance
    - _Requirements: 35.1, 22.1, 22.6, 32.1_

  - [ ] 19.8 Create RTSA dashboard endpoints
    - GET /api/rtsa/journeys/active - Get all active journeys
    - GET /api/rtsa/operators - Get all operators with compliance scores
    - GET /api/rtsa/operators/:id/compliance - Get compliance history
    - GET /api/rtsa/operators/flagged - Get flagged operators
    - GET /api/rtsa/safety-alerts - Get safety alerts feed
    - GET /api/rtsa/audit-logs - Search audit logs
    - POST /api/rtsa/reports/export - Export compliance reports
    - _Requirements: 10.1, 10.3, 11.6, 10.4, 28.7_

  - [ ] 19.9 Create ratings and incident endpoints
    - POST /api/ratings - Submit journey rating
    - POST /api/incidents - Report incident
    - PUT /api/incidents/:id/resolve - Resolve incident (operator)
    - GET /api/incidents/unresolved - Get unresolved incidents
    - _Requirements: 21.1, 38.1, 38.6, 38.8_

  - [ ] 19.10 Create promotional code endpoints
    - POST /api/promo-codes - Create promotional code (operator)
    - POST /api/bookings/apply-promo - Apply promotional code
    - GET /api/promo-codes/:code/validate - Validate promotional code
    - _Requirements: 36.1, 36.2, 36.3_

  - [ ] 19.11 Implement API rate limiting middleware
    - Implement rate limiting using Redis counters
    - Limit unauthenticated requests to 100 per IP per hour
    - Limit authenticated requests to 1000 per user per hour
    - Return HTTP 429 with retry-after header when exceeded
    - Implement exponential backoff for repeated violations
    - Whitelist RTSA IP addresses
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

  - [ ]\* 19.12 Write property test for rate limiting enforcement
    - **Property 35: Rate Limiting Enforcement**
    - **Validates: Requirements 25.1, 25.2**

  - [ ] 19.13 Implement API error handling middleware
    - Implement consistent error response format
    - Map exceptions to appropriate HTTP status codes
    - Include request ID for tracing
    - Log all errors with context
    - _Requirements: Error Handling section_

- [ ] 20. Implement dynamic pricing and promotions
  - [ ] 20.1 Create promotional code management
    - Implement createPromoCode function with discount type and value
    - Set validity periods and usage limits
    - Track current_uses and prevent exceeding max_uses
    - _Requirements: 36.1, 36.3_

  - [ ] 20.2 Implement promotional code validation and application
    - Implement validatePromoCode checking validity period and usage limits
    - Apply discount to booking amount (percentage or fixed)
    - Prevent stacking multiple promotional codes
    - Track redemption rates
    - _Requirements: 36.2, 36.4, 36.5_

  - [ ]\* 20.3 Write property test for promotional code stacking prevention
    - **Property 37: Promotional Code Stacking Prevention**
    - **Validates: Requirements 36.4**

  - [ ] 20.4 Implement dynamic pricing algorithm
    - Calculate demand based on booked seats vs total capacity
    - Increase prices by up to 50% when demand is high
    - Decrease prices by up to 30% when demand is low within 24 hours of departure
    - Update journey current_price based on demand
    - _Requirements: 36.6, 36.7, 36.8_

  - [ ]\* 20.5 Write property test for dynamic pricing bounds
    - **Property 38: Dynamic Pricing Bounds**
    - **Validates: Requirements 36.7, 36.8**

- [ ] 21. Implement ratings, feedback, and incident reporting
  - [ ] 21.1 Create rating submission service
    - Implement submitRating function creating ratings record
    - Validate rating is between 1 and 5 stars
    - Request specific feedback categories for ratings below 3 stars
    - Associate rating with driver, vehicle, operator, journey
    - _Requirements: 21.1, 21.2, 21.3, 21.4_

  - [ ] 21.2 Implement rating aggregation and analytics
    - Calculate average ratings for drivers and operators updated daily
    - Display operator ratings on RTSA dashboard
    - Notify RTSA when operator average rating falls below 3 stars over 30 days
    - _Requirements: 21.5, 21.6, 21.7_

  - [ ] 21.3 Create incident reporting service
    - Implement reportIncident function creating incidents record
    - Request incident type, description, optional photo evidence
    - Categorize incidents (safety violation, driver behavior, vehicle condition, other)
    - Store GPS location with incident
    - Notify operator immediately
    - Notify RTSA for safety violation incidents
    - _Requirements: 38.1, 38.2, 38.3, 38.4, 38.5_

  - [ ] 21.4 Implement incident resolution tracking
    - Allow operators to respond with resolution notes
    - Track incident resolution time
    - Include resolution time in operator compliance metrics
    - Display unresolved incidents on RTSA dashboard with aging indicators
    - _Requirements: 38.6, 38.7, 38.8_

- [ ] 22. Implement emergency contact management
  - [ ] 22.1 Create emergency contact service
    - Implement addEmergencyContact function with name and phone validation
    - Validate Zambian mobile number format
    - Limit to 5 emergency contacts per passenger
    - Send verification SMS to contact
    - _Requirements: 18.1, 18.2, 18.3_

  - [ ] 22.2 Implement emergency contact verification
    - Generate verification token and store in Redis
    - Send SMS with verification link
    - Implement verifyEmergencyContact function updating is_verified flag
    - Display verification status in app
    - _Requirements: 18.3, 18.6_

  - [ ] 22.3 Implement emergency contact management
    - Allow editing contact details
    - Allow removing contacts
    - Only notify verified contacts during SOS events
    - _Requirements: 18.4, 18.5_

- [ ] 23. Implement audit logging and compliance
  - [ ] 23.1 Create audit logging service
    - Implement logAuditEvent function creating audit_logs record
    - Log user authentication events with timestamps, IP addresses, user agents
    - Log booking transactions with passenger ID, operator ID, amount, payment status
    - Log safety events with GPS coordinates, severity, resolution status
    - Log RTSA dashboard actions with official ID and action type
    - _Requirements: 28.1, 28.2, 28.3, 28.4_

  - [ ] 23.2 Implement audit log storage and retention
    - Store audit logs in separate database with write-only access
    - Retain audit logs for 7 years
    - Generate tamper-evident log hashes using HMAC
    - _Requirements: 28.5, 28.6, 28.8_

  - [ ] 23.3 Implement audit log search and export
    - Implement searchAuditLogs function with filtering by user, action type, date range
    - Allow RTSA officials to export audit logs
    - _Requirements: 28.7_

- [ ] 24. Implement data backup and recovery
  - [ ] 24.1 Create automated backup service
    - Configure PostgreSQL automated backups every 6 hours
    - Store backups in AWS S3 with encryption at rest
    - Retain daily backups for 30 days, monthly backups for 1 year
    - Backup Redis cache data daily
    - _Requirements: 26.1, 26.2, 26.3, 26.7_

  - [ ] 24.2 Implement backup verification and alerting
    - Verify backup integrity by performing test restores
    - Send alert notifications to administrators on backup failures
    - Document recovery procedures with 4-hour RTO target
    - _Requirements: 26.4, 26.5, 26.6_

- [ ] 25. Implement monitoring and alerting
  - [ ] 25.1 Set up CloudWatch monitoring
    - Track API response times with 95th percentile metrics
    - Monitor database query performance and identify slow queries
    - Track WebSocket connection counts and message throughput
    - Monitor database connection pool utilization
    - _Requirements: 30.1, 30.2, 30.3, 30.5_

  - [ ] 25.2 Configure CloudWatch alarms
    - Alert when API response time exceeds 2 seconds for 5 consecutive requests
    - Alert when database connection pool utilization exceeds 80%
    - Alert on payment processing failures
    - Alert on database connection failures
    - Alert on high error rates (>5% of requests)
    - _Requirements: 30.4, 30.5_

  - [ ] 25.3 Create system health dashboard
    - Display active users, active journeys, system health metrics
    - Show real-time performance indicators
    - _Requirements: 30.7_

- [ ] 26. Checkpoint - Verify backend API and infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 27. Implement Driver App (React Native)
  - [ ] 27.1 Set up Driver App project structure
    - Initialize React Native project with TypeScript
    - Configure React Navigation for screen routing
    - Set up Redux Toolkit for state management
    - Configure Socket.io-client for WebSocket connections
    - Set up React Native Background Geolocation
    - _Requirements: 4.1, 12.1_

  - [ ] 27.2 Implement driver authentication screens
    - Create login screen with phone number and password inputs
    - Implement JWT token storage using secure storage
    - Implement automatic token refresh
    - Handle token expiration and re-authentication
    - _Requirements: 20.1, 20.3, 20.5_

  - [ ] 27.3 Implement journey management screens
    - Create journey list screen displaying scheduled journeys
    - Implement journey details screen with route, passenger count, next stop
    - Create start journey button with validation (not more than 30 minutes early)
    - Create end journey button updating journey status
    - Send notifications to passengers on journey start
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [ ] 27.4 Implement GPS tracking with offline buffering
    - Configure background geolocation with 5-second interval
    - Implement GPS data transmission to backend API
    - Implement offline buffer using AsyncStorage (max 1000 records)
    - Implement FIFO buffer overflow handling
    - Implement automatic synchronization on network reconnection
    - Display buffer status (record count, oldest timestamp) to driver
    - Continue transmission attempts for 24 hours after journey ends
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 13.1, 13.2, 13.3, 13.6, 13.7_

  - [ ]\* 27.5 Write property test for offline GPS buffering
    - **Property 12: Offline GPS Buffering Activation**
    - **Property 13: Buffer Synchronization on Reconnection**
    - **Property 23: Offline Buffer Capacity Limit**
    - **Property 24: Buffer Overflow FIFO Behavior**
    - **Property 6: GPS Timestamp Preservation Through Buffering**
    - **Validates: Requirements 4.3, 4.4, 13.2, 13.3, 13.8**

  - [ ] 27.6 Implement QR code scanning for boarding
    - Integrate QR code scanner using react-native-camera
    - Call validateQRCode API endpoint
    - Display passenger name, seat number, booking status
    - Show error message for invalid/canceled/expired bookings
    - Prevent duplicate boarding
    - _Requirements: 14.4, 14.5, 14.6, 14.7_

  - [ ] 27.7 Implement planned detour marking
    - Create detour marking screen with route segment selection
    - Submit planned detour to backend API
    - Display active detours on journey screen
    - _Requirements: 7.5_

  - [ ] 27.8 Implement driver performance dashboard
    - Display driver performance score
    - Show safety violations, on-time performance, passenger ratings
    - Display performance trends over time
    - _Requirements: 32.1, 32.2_

- [ ] 28. Implement Passenger App (React Native)
  - [ ] 28.1 Set up Passenger App project structure
    - Initialize React Native project with TypeScript
    - Configure React Navigation for screen routing
    - Set up Redux Toolkit for state management
    - Configure Socket.io-client for WebSocket connections
    - Integrate React Native Maps with Google Maps
    - _Requirements: 5.1_

  - [ ] 28.2 Implement passenger authentication and registration
    - Create registration screen with phone number, name, email inputs
    - Create login screen with phone number authentication
    - Implement JWT token storage using secure storage
    - _Requirements: 20.1_

  - [ ] 28.3 Implement journey search and booking flow
    - Create search screen with origin, destination, date, time inputs
    - Display available journeys with pricing and availability
    - Create seat selection screen showing available seats
    - Implement 10-minute reservation countdown timer
    - Create payment screen with mobile money provider selection
    - Display booking confirmation with QR code
    - _Requirements: 1.1, 1.2, 1.4, 3.1, 14.1, 14.2_

  - [ ] 28.4 Implement booking management screens
    - Create booking history screen with chronological list
    - Display booking details with journey information
    - Implement booking cancellation with 2-hour window check
    - Implement seat change functionality
    - Display refund information
    - _Requirements: 1.5, 1.6, 31.1, 31.5, 34.1, 34.2_

  - [ ] 28.5 Implement 3D real-time tracking with Google Maps
    - Create tracking screen with Google Maps 3D view
    - Establish WebSocket connection for real-time position updates
    - Display bus icon on map with smooth position updates
    - Show route path with current position highlighted
    - Display ETA to passenger's pickup point
    - Show last known position with timestamp when offline
    - Implement automatic reconnection with exponential backoff
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 5.8, 16.1, 16.4_

  - [ ] 28.6 Implement tracking link sharing
    - Create share journey button generating tracking link
    - Share link via native share dialog
    - _Requirements: 19.1_

  - [ ] 28.7 Implement safety alert notifications
    - Display push notifications for speed violations
    - Display push notifications for route deviations
    - Show alert details (type, location, timestamp) in notification
    - _Requirements: 6.2, 7.2_

  - [ ] 28.8 Implement SOS emergency system
    - Create SOS button with confirmation dialog
    - Display warning about emergency notification
    - Trigger SOS alert with current location
    - Show SOS active status with continuous tracking indicator
    - Allow canceling false alarms within 2 minutes
    - _Requirements: 8.1, 8.6, 9.5_

  - [ ] 28.9 Implement emergency contact management
    - Create emergency contacts screen listing all contacts
    - Implement add contact form with name and phone validation
    - Display verification status for each contact
    - Allow editing and removing contacts
    - Limit to 5 contacts
    - _Requirements: 18.1, 18.2, 18.4, 18.6_

  - [ ] 28.10 Implement ratings and feedback
    - Display rating prompt after journey completion
    - Create rating screen with 1-5 star selection
    - Request feedback categories for ratings below 3 stars
    - Allow optional text feedback
    - _Requirements: 21.1, 21.2, 21.3_

  - [ ] 28.11 Implement incident reporting
    - Create incident reporting screen accessible during and after journeys
    - Request incident type, description, optional photo
    - Capture GPS location with incident
    - Submit incident to backend API
    - _Requirements: 38.1, 38.2_

  - [ ] 28.12 Implement journey history and receipts
    - Display chronological journey history with filtering
    - Show detailed journey information
    - Generate and download PDF receipts
    - Display monthly and yearly spending totals
    - _Requirements: 34.1, 34.2, 34.3, 34.4, 34.5, 34.6_

  - [ ] 28.13 Implement notification preferences
    - Create notification settings screen
    - Allow enabling/disabling each notification type independently
    - Choose delivery method (push, SMS, both)
    - Display warning when disabling safety alerts
    - Always send SOS alerts regardless of preferences
    - Sync preferences across devices
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6, 33.7_

  - [ ] 28.14 Implement multi-language support
    - Detect device language and set as default
    - Create language selection in settings
    - Support English, Bemba, Nyanja
    - Update all UI text immediately on language change
    - _Requirements: 27.1, 27.2, 27.3, 27.4_

  - [ ] 28.15 Implement accessibility features
    - Support screen readers on iOS and Android
    - Implement high-contrast mode
    - Support font size adjustment (100%-200%)
    - Provide voice-guided navigation for booking steps
    - Indicate wheelchair accessibility requirement during booking
    - Filter for wheelchair-accessible vehicles
    - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5, 37.7_

- [ ] 29. Implement RTSA Dashboard (React.js + CesiumJS)
  - [ ] 29.1 Set up RTSA Dashboard project structure
    - Initialize React.js project with TypeScript
    - Configure React Router for navigation
    - Set up Redux Toolkit for state management
    - Integrate CesiumJS for 3D map rendering
    - Configure Socket.io-client for WebSocket connections
    - Integrate Material-UI component library
    - _Requirements: 10.1_

  - [ ] 29.2 Implement RTSA official authentication
    - Create login screen with multi-factor authentication
    - Implement JWT token storage and refresh
    - Log all official actions with timestamps and user IDs
    - _Requirements: 10.7, 10.8, 28.4_

  - [ ] 29.3 Implement 3D fleet monitoring map
    - Create main dashboard with CesiumJS 3D map
    - Display all active journeys on map using Google Maps 3D Tiles API
    - Establish WebSocket connections for real-time position updates
    - Update bus positions in real-time
    - Render photorealistic 3D buildings and terrain
    - _Requirements: 10.1, 10.2, 5.6_

  - [ ] 29.4 Implement journey details panel
    - Display journey details on bus selection
    - Show passenger count, driver information, route details
    - Display recent safety events for selected journey
    - _Requirements: 10.3_

  - [ ] 29.5 Implement filtering and search
    - Create filters for operators, routes, safety alert types
    - Implement search functionality for vehicles and drivers
    - _Requirements: 10.4_

  - [ ] 29.6 Implement safety alerts feed
    - Create live feed panel displaying safety alerts
    - Show speeding, route deviations, SOS events in real-time
    - Update feed via WebSocket
    - Display alert details (type, severity, location, timestamp)
    - _Requirements: 10.5, 6.4, 7.3_

  - [ ] 29.7 Implement compliance scoring dashboard
    - Display operator list with compliance scores
    - Show compliance score trends over time with monthly aggregations
    - Highlight flagged operators (score < 70 for review, < 50 for suspension)
    - Display compliance history for selected operator
    - _Requirements: 11.1, 11.6, 11.7, 11.8_

  - [ ] 29.8 Implement compliance report export
    - Create export functionality for compliance reports
    - Generate PDF and CSV formats
    - Include operator scores, violations, trends
    - _Requirements: 10.6_

  - [ ] 29.9 Implement audit log viewer
    - Create audit log search interface with filters
    - Display logs with user, action type, timestamp, details
    - Implement export functionality
    - _Requirements: 28.7_

  - [ ] 29.10 Implement SOS alert monitoring
    - Display active SOS alerts with priority highlighting
    - Show passenger details, location, journey information
    - Display continuous location tracking during SOS
    - _Requirements: 8.2, 8.5_

  - [ ] 29.11 Implement incident management
    - Display unresolved incidents with aging indicators
    - Show incident details (type, description, photo, location)
    - Filter by incident type and status
    - _Requirements: 38.8_

  - [ ] 29.12 Implement operator ratings display
    - Show operator ratings alongside compliance scores
    - Display rating trends over time
    - Highlight operators with average rating below 3 stars
    - _Requirements: 21.6, 21.7_

- [ ] 30. Implement Tracking Link Web Interface (CesiumJS)
  - [ ] 30.1 Create standalone tracking link page
    - Create React.js page for tracking links
    - Integrate CesiumJS for 3D map rendering
    - Parse tracking token from URL
    - Validate tracking link and retrieve journey details
    - _Requirements: 19.2, 19.3_

  - [ ] 30.2 Implement 3D map tracking view
    - Display 3D map with Google Maps 3D Tiles API
    - Establish WebSocket connection for real-time updates
    - Display bus position with smooth updates
    - Show route path with current position highlighted
    - Display journey details (route, departure time, ETA)
    - _Requirements: 5.6, 19.4, 19.5_

  - [ ] 30.3 Implement journey completion display
    - Show completion message when journey ends
    - Display actual arrival time
    - Close WebSocket connection
    - _Requirements: 19.5_

  - [ ] 30.4 Implement viewer limit enforcement
    - Track concurrent viewers using Redis counter
    - Reject connections when limit of 50 viewers is reached
    - Display error message for rejected viewers
    - _Requirements: 19.7_

- [ ] 31. Implement operator dashboard and analytics
  - [ ] 31.1 Create operator dashboard web interface
    - Create React.js dashboard for operators
    - Display revenue, bookings, occupancy rates
    - Show daily, weekly, monthly revenue trends with charts
    - _Requirements: 35.1, 35.2_

  - [ ] 31.2 Implement occupancy and route analytics
    - Calculate occupancy rate (booked seats / total seats)
    - Identify top-performing and underperforming routes
    - Display route profitability analysis (revenue, fuel costs, wages)
    - _Requirements: 35.3, 35.4, 35.7_

  - [ ] 31.3 Implement upcoming journeys view
    - Display upcoming journeys with current booking status
    - Show real-time seat availability
    - _Requirements: 35.5_

  - [ ] 31.4 Implement analytics export
    - Allow exporting analytics data in CSV and PDF formats
    - _Requirements: 35.6_

  - [ ] 31.5 Implement driver rankings
    - Display driver performance rankings within fleet
    - Show performance scores and metrics
    - _Requirements: 32.6_

  - [ ] 31.6 Implement driver performance export
    - Allow exporting driver performance data in CSV format
    - _Requirements: 32.7_

- [ ] 32. Checkpoint - Verify all frontend applications
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 33. Implement ZICTA compliance and telecom integration
  - [ ] 33.1 Implement ZICTA short code integration
    - Configure USSD service to use \*147# short code
    - Establish direct USSD gateway connections with Airtel, MTN, Zamtel
    - Implement operator-specific request/response handling (XML/JSON)
    - Maintain separate connection pools for each operator
    - _Requirements: 23.1, 23.2, 23.7_

  - [ ] 33.2 Implement ZICTA compliance logging
    - Log all USSD sessions with session IDs, network operator, ZICTA metadata
    - Generate monthly usage reports in ZICTA-required format
    - _Requirements: 23.4, 23.5_

  - [ ] 33.3 Implement ZICTA harmonization handling
    - Handle ZICTA harmonization requests for short code conflicts
    - Implement short code suspension capability (disable within 1 hour)
    - _Requirements: 23.3, 23.6_

  - [ ] 33.4 Implement telecom gateway failover
    - Implement automatic failover between telecom operators
    - Detect gateway unavailability and route to alternative operator
    - _Requirements: 23.8_

- [ ] 34. Implement GPS data privacy and retention
  - [ ] 34.1 Implement GPS data collection controls
    - Only collect GPS data during active journeys
    - Stop collection when journey ends
    - Display privacy notice in Driver App
    - _Requirements: 39.1, 39.8_

  - [ ] 34.2 Implement GPS data retention policy
    - Create background job for GPS data retention enforcement
    - Retain GPS data for 90 days
    - Anonymize data older than 90 days by removing driver and vehicle identifiers
    - _Requirements: 39.2, 39.3_

  - [ ]\* 34.3 Write property test for GPS data retention
    - **Property 40: GPS Data Retention Policy**
    - **Validates: Requirements 39.2, 39.3**

  - [ ] 34.4 Implement GPS data encryption
    - Encrypt GPS data at rest using AES-256
    - Encrypt GPS data in transit using TLS 1.3
    - _Requirements: 39.4, 39.5_

  - [ ] 34.5 Implement GPS data access controls
    - Restrict GPS data access to authorized personnel only
    - Log all GPS data access requests with user ID and purpose
    - _Requirements: 39.6, 39.7_

- [ ] 35. Implement network resilience and high availability
  - [ ] 35.1 Configure AWS multi-AZ deployment
    - Deploy backend services across multiple availability zones
    - Configure Application Load Balancer for HTTP/HTTPS traffic
    - Configure Network Load Balancer for WebSocket connections
    - Set up Auto Scaling Groups for EC2 instances
    - _Requirements: 29.1_

  - [ ] 35.2 Configure database high availability
    - Set up RDS PostgreSQL Multi-AZ deployment
    - Configure automatic failover
    - Set up read replicas for query load distribution
    - _Requirements: 29.3_

  - [ ] 35.3 Configure Redis high availability
    - Set up ElastiCache Redis Cluster with automatic failover
    - Configure cluster mode for data sharding
    - _Requirements: 29.4_

  - [ ] 35.4 Implement health check endpoints
    - Create /health endpoint returning HTTP 200 when operational
    - Check database connectivity, Redis connectivity, external service availability
    - Return HTTP 503 when dependencies fail
    - Trigger automated alerts on health check failures
    - _Requirements: 29.5, 29.6_

  - [ ] 35.5 Configure automatic failover
    - Configure load balancer health checks
    - Set up automatic traffic routing to healthy instances within 30 seconds
    - _Requirements: 29.2_

  - [ ] 35.6 Implement uptime monitoring
    - Track uptime metrics with CloudWatch
    - Target 99.9% uptime measured monthly
    - _Requirements: 29.7_

- [ ] 36. Implement security hardening
  - [ ] 36.1 Implement SQL injection prevention
    - Use parameterized queries for all database operations
    - Validate and sanitize all user inputs
    - _Requirements: Security Testing section_

  - [ ] 36.2 Implement XSS and CSRF protection
    - Implement Content Security Policy headers
    - Use CSRF tokens for state-changing operations
    - Sanitize all user-generated content before rendering
    - _Requirements: Security Testing section_

  - [ ] 36.3 Implement JWT token security
    - Use strong secret keys for JWT signing
    - Implement token expiration and refresh
    - Implement token blacklist for logout
    - _Requirements: 20.3, 20.5_

  - [ ] 36.4 Implement data encryption
    - Configure TLS 1.3 for all API endpoints
    - Encrypt sensitive data at rest (passwords, payment info)
    - Use AWS KMS for key management
    - _Requirements: 39.4, 39.5_

  - [ ] 36.5 Implement security headers
    - Configure HSTS, X-Frame-Options, X-Content-Type-Options headers
    - Implement CORS with whitelist of allowed origins
    - _Requirements: Security Testing section_

- [ ] 37. Implement integration tests
  - [ ]\* 37.1 Write integration test for complete booking flow
    - Test seat selection → payment → confirmation → QR code generation
    - Verify SMS notifications sent
    - _Requirements: 1.1, 1.2, 1.4, 3.2, 14.1, 17.1_

  - [ ]\* 37.2 Write integration test for GPS tracking flow
    - Test GPS data capture → buffering → transmission → broadcast
    - Verify WebSocket broadcasting to passengers
    - _Requirements: 4.1, 4.3, 4.4, 5.2_

  - [ ]\* 37.3 Write integration test for safety monitoring flow
    - Test GPS data → violation detection → alert → compliance update
    - Verify notifications sent to passengers and RTSA
    - _Requirements: 6.1, 6.2, 6.7, 11.3_

  - [ ]\* 37.4 Write integration test for SOS flow
    - Test SOS trigger → notification → tracking → resolution
    - Verify emergency contacts notified
    - _Requirements: 8.1, 8.2, 8.5, 8.8_

  - [ ]\* 37.5 Write integration test for USSD booking flow
    - Test USSD session → booking → payment → confirmation
    - Verify SMS confirmation sent
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 38. Implement end-to-end tests
  - [ ]\* 38.1 Write E2E test for passenger booking journey
    - Test complete flow from app launch to booking confirmation
    - Verify QR code displayed
    - _Requirements: 1.1, 1.2, 1.4, 14.1_

  - [ ]\* 38.2 Write E2E test for driver journey management
    - Test driver login → start journey → GPS tracking → end journey
    - Verify GPS data transmitted
    - _Requirements: 12.1, 12.2, 12.4, 4.1_

  - [ ]\* 38.3 Write E2E test for real-time tracking
    - Test passenger viewing live bus position on 3D map
    - Verify position updates in real-time
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]\* 38.4 Write E2E test for RTSA dashboard monitoring
    - Test RTSA official login → view active journeys → view safety alerts
    - Verify compliance scores displayed
    - _Requirements: 10.1, 10.2, 10.5, 11.1_

- [ ] 39. Final integration and deployment preparation
  - [ ] 39.1 Configure production environment variables
    - Set up environment-specific configurations for dev, staging, production
    - Configure database connection strings, API keys, secrets
    - Use AWS Secrets Manager for sensitive credentials
    - _Requirements: Infrastructure_

  - [ ] 39.2 Set up CI/CD pipeline
    - Configure automated testing on every commit
    - Set up automated deployment to staging environment
    - Implement manual approval for production deployment
    - _Requirements: Continuous Integration section_

  - [ ] 39.3 Configure CloudFront CDN
    - Set up CloudFront distribution for static assets
    - Configure caching policies
    - _Requirements: Deployment Architecture_

  - [ ] 39.4 Perform load testing
    - Test system with 1000 concurrent users
    - Test GPS data ingestion rate (1000 points/second)
    - Verify API response times under load
    - _Requirements: Performance Testing section_

  - [ ] 39.5 Perform security testing
    - Run OWASP ZAP security scans
    - Run npm audit and Snyk vulnerability scans
    - Fix identified vulnerabilities
    - _Requirements: Security Testing section_

  - [ ] 39.6 Create deployment documentation
    - Document deployment procedures
    - Document rollback procedures
    - Document monitoring and alerting setup
    - _Requirements: 26.6_

  - [ ] 39.7 Perform smoke tests in production
    - Verify all critical endpoints accessible
    - Verify WebSocket connections working
    - Verify database connectivity
    - Verify external integrations (payment, telecom) working
    - _Requirements: Continuous Integration section_

- [ ] 40. Final checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties from the design document
- Integration and E2E tests validate complete user workflows
- Implementation follows bottom-up approach: infrastructure → data → business logic → integrations → UI
- Checkpoints ensure incremental validation at major milestones
- All code examples use TypeScript as specified in the design document
- Direct telecom integration (no third-party aggregators) is a critical architectural decision
- Multi-platform system requires coordination between mobile apps, web dashboard, and backend services
