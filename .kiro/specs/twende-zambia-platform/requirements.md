# Requirements Document

## Introduction

Twende Zambia is a comprehensive multi-platform transportation safety and booking system designed to modernize bus travel in Zambia. The platform enables passengers to book seats via mobile apps or USSD, track buses in real-time using 3D mapping, and access safety features including SOS alerts. It provides drivers with GPS-enabled journey management tools, integrates mobile money payments, and offers the Road Transport and Safety Agency (RTSA) a government dashboard for fleet monitoring and compliance scoring. The system integrates directly with Zambian telecom operators (Airtel, MTN, Zamtel) for USSD and SMS services. The system aims to improve passenger safety, increase transparency in the transport sector, and enable regulatory oversight.

## Glossary

- **Passenger_App**: React Native mobile application for passengers to book seats and track buses
- **Driver_App**: React Native mobile application for drivers to manage journeys and transmit GPS data
- **USSD_Service**: USSD-based booking and tracking service accessible via \*147# short code, integrated directly with telecom operators
- **SMS_Gateway**: Direct integration with Airtel, MTN, and Zamtel SMS gateways for message delivery
- **Telecom_Integration**: Direct API connections to Zambian telecom operators for USSD and SMS services
- **Backend_API**: Node.js/Express server providing REST and WebSocket endpoints
- **RTSA_Dashboard**: React.js web application for government fleet monitoring and compliance
- **Tracking_Link**: Browser-based CesiumJS 3D tracking interface accessible via shared URL
- **Booking_System**: Component managing seat reservations and availability
- **Payment_Gateway**: Integration layer for Airtel Money, MTN MoMo, and Zamtel Kwacha
- **GPS_Tracker**: Background geolocation service with offline buffering capability
- **Safety_Monitor**: Component detecting speeding, route deviations, and processing SOS alerts
- **Compliance_Scorer**: System calculating operator compliance based on safety metrics
- **Mobile_Money**: Electronic payment systems including Airtel Money, MTN MoMo, Zamtel Kwacha
- **SOS_System**: Emergency alert mechanism for passengers in distress
- **Route**: Predefined bus journey path with origin, destination, and waypoints
- **Journey**: Specific instance of a bus traveling a route at a scheduled time
- **Operator**: Bus company managing one or more vehicles
- **RTSA**: Road Transport and Safety Agency (Zambian government regulatory body)
- **ZICTA**: Zambia Information and Communications Technology Authority
- **3D_Map_Renderer**: CesiumJS-based visualization using Google Maps 3D Tiles API
- **Offline_Buffer**: Local storage mechanism for GPS data when network is unavailable
- **Compliance_Score**: Numerical rating (0-100) reflecting operator safety performance
- **Speed_Threshold**: Maximum allowed velocity for a vehicle on a specific route segment
- **Route_Deviation**: Distance exceeding acceptable variance from predefined route path
- **Emergency_Contact**: User-designated person to notify during SOS events

## Requirements

### Requirement 1: Passenger Seat Booking via Mobile App

**User Story:** As a passenger, I want to book bus seats through the mobile app, so that I can secure my travel in advance and avoid queuing at bus stations.

#### Acceptance Criteria

1. WHEN a passenger selects a route, date, and time, THE Booking_System SHALL display available seats with pricing
2. WHEN a passenger selects an available seat, THE Booking_System SHALL reserve it for 10 minutes
3. IF a reservation expires without payment, THEN THE Booking_System SHALL release the seat for other passengers
4. WHEN a passenger completes payment, THE Booking_System SHALL confirm the booking and send a confirmation SMS
5. THE Passenger_App SHALL display booking history with journey details and QR codes
6. WHEN a passenger cancels a booking at least 2 hours before departure, THE Booking_System SHALL process a refund minus a 10% cancellation fee
7. FOR ALL booking operations, creating a booking then canceling it then checking availability SHALL show the seat as available (round-trip property)

### Requirement 2: USSD-Based Booking for Feature Phones

**User Story:** As a passenger without a smartphone, I want to book seats via USSD, so that I can access the service using any mobile phone.

#### Acceptance Criteria

1. WHEN a user dials \*147#, THE USSD_Service SHALL display the main menu with booking, tracking, and SOS options
2. WHEN a user selects booking, THE USSD_Service SHALL guide them through route, date, time, and seat selection using numbered menus
3. WHEN a user completes seat selection, THE USSD_Service SHALL initiate a mobile money payment prompt
4. WHEN payment is confirmed, THE USSD_Service SHALL send a booking confirmation SMS with a booking reference code
5. THE USSD_Service SHALL support session timeout of 60 seconds with automatic state preservation
6. WHEN a user enters an invalid menu option, THE USSD_Service SHALL display an error message and re-prompt
7. THE USSD_Service SHALL support English, Bemba, and Nyanja languages

### Requirement 3: Mobile Money Payment Integration

**User Story:** As a passenger, I want to pay for bookings using mobile money, so that I can complete transactions without cash or bank cards.

#### Acceptance Criteria

1. WHEN a passenger initiates payment, THE Payment_Gateway SHALL detect their mobile network and offer the corresponding mobile money option
2. WHEN a passenger confirms payment, THE Payment_Gateway SHALL send a push prompt to their mobile money account
3. WHEN payment is successful, THE Payment_Gateway SHALL update the booking status to confirmed within 5 seconds
4. IF payment fails, THEN THE Payment_Gateway SHALL notify the passenger and maintain the seat reservation for retry
5. THE Payment_Gateway SHALL support Airtel Money, MTN MoMo, and Zamtel Kwacha
6. WHEN a refund is processed, THE Payment_Gateway SHALL credit the passenger's mobile money account within 24 hours
7. THE Backend_API SHALL log all payment transactions with timestamps and transaction IDs for audit purposes
8. FOR ALL successful payments, the sum of booking amount and refund amount SHALL equal the original payment amount (invariant property)

### Requirement 4: Real-Time GPS Tracking from Driver App

**User Story:** As a driver, I want the app to automatically transmit my location, so that passengers can track the bus without manual intervention.

#### Acceptance Criteria

1. WHEN a driver starts a journey, THE GPS_Tracker SHALL begin transmitting location data every 5 seconds
2. WHILE the journey is active, THE GPS_Tracker SHALL continue transmitting even when the app is in the background
3. WHEN network connectivity is unavailable, THE GPS_Tracker SHALL buffer location data in the Offline_Buffer
4. WHEN network connectivity is restored, THE GPS_Tracker SHALL transmit all buffered location data in chronological order
5. THE GPS_Tracker SHALL include timestamp, latitude, longitude, speed, and heading in each transmission
6. WHEN a driver ends a journey, THE GPS_Tracker SHALL stop transmitting and clear the Offline_Buffer
7. THE Driver_App SHALL display current transmission status and buffer size to the driver
8. FOR ALL buffered GPS data, the order of transmission SHALL match the order of capture (confluence property)

### Requirement 5: 3D Real-Time Bus Tracking for Passengers

**User Story:** As a passenger, I want to see my bus location on a 3D map in real-time, so that I can plan my arrival at the pickup point and know when to expect the bus.

#### Acceptance Criteria

1. WHEN a passenger views an active journey, THE Passenger_App SHALL display the bus position on a 3D map using the 3D_Map_Renderer
2. WHEN the Backend_API receives new GPS data, THE Backend_API SHALL broadcast the position to all connected passengers via WebSocket within 1 second
3. THE 3D_Map_Renderer SHALL update the bus icon position smoothly without flickering
4. THE Passenger_App SHALL display estimated time of arrival (ETA) to the passenger's pickup point
5. WHEN a passenger shares a tracking link, THE Tracking_Link SHALL display the same 3D map view without requiring authentication
6. THE 3D_Map_Renderer SHALL render photorealistic 3D buildings and terrain using Google Maps 3D Tiles API
7. WHEN network connectivity is poor, THE Passenger_App SHALL display the last known position with a timestamp
8. THE Passenger_App SHALL show the complete route path with the bus's current position highlighted

### Requirement 6: Speed Monitoring and Alerts

**User Story:** As a passenger, I want to be alerted when the bus is speeding, so that I am aware of unsafe driving and can take action if needed.

#### Acceptance Criteria

1. WHEN the GPS_Tracker reports speed exceeding the Speed_Threshold for a route segment, THE Safety_Monitor SHALL detect the violation within 10 seconds
2. WHEN a speed violation is detected, THE Safety_Monitor SHALL send a push notification to all passengers on the journey
3. WHEN a speed violation is detected, THE Safety_Monitor SHALL log the event with timestamp, location, speed, and driver ID
4. WHEN a speed violation is detected, THE Safety_Monitor SHALL notify the RTSA_Dashboard in real-time
5. THE Safety_Monitor SHALL use Speed_Threshold values of 80 km/h for urban routes and 100 km/h for highway routes
6. WHEN multiple speed violations occur within 10 minutes, THE Safety_Monitor SHALL escalate the alert to the operator
7. THE Safety_Monitor SHALL update the operator's Compliance_Score by deducting 2 points per violation
8. FOR ALL speed violations, the count of violations SHALL equal the count of logged events (invariant property)

### Requirement 7: Route Deviation Detection

**User Story:** As a passenger, I want to be notified if the bus deviates from the expected route, so that I can ensure my safety and report suspicious behavior.

#### Acceptance Criteria

1. WHEN the GPS_Tracker reports a position exceeding 500 meters from the predefined Route path, THE Safety_Monitor SHALL detect a Route_Deviation
2. WHEN a Route_Deviation is detected, THE Safety_Monitor SHALL send an alert to all passengers with the current location
3. WHEN a Route_Deviation persists for more than 5 minutes, THE Safety_Monitor SHALL notify Emergency_Contacts and the RTSA_Dashboard
4. THE Safety_Monitor SHALL allow drivers to mark planned detours in advance to avoid false alerts
5. WHEN a driver marks a planned detour, THE Safety_Monitor SHALL suppress Route_Deviation alerts for that segment
6. THE Safety_Monitor SHALL log all Route_Deviation events with duration, distance from route, and resolution status
7. THE Safety_Monitor SHALL deduct 5 points from the operator's Compliance_Score for each unplanned Route_Deviation

### Requirement 8: Passenger SOS Emergency System

**User Story:** As a passenger, I want to trigger an SOS alert during emergencies, so that my emergency contacts and authorities are immediately notified of my situation.

#### Acceptance Criteria

1. WHEN a passenger activates the SOS button, THE SOS_System SHALL send immediate notifications to all designated Emergency_Contacts via SMS
2. WHEN a passenger activates the SOS button, THE SOS_System SHALL notify the RTSA_Dashboard with the passenger's current location and journey details
3. WHEN a passenger activates the SOS button, THE SOS_System SHALL alert all other passengers on the same journey
4. THE SOS_System SHALL include GPS coordinates, timestamp, passenger name, and bus details in all notifications
5. WHEN an SOS is triggered, THE SOS_System SHALL initiate continuous location tracking every 2 seconds until the alert is resolved
6. THE Passenger_App SHALL require confirmation before activating SOS to prevent accidental triggers
7. THE SOS_System SHALL log all SOS events with resolution status and response time
8. WHEN an SOS is resolved, THE SOS_System SHALL send confirmation notifications to all previously notified parties

### Requirement 9: USSD-Based SOS Access

**User Story:** As a passenger using a feature phone, I want to trigger SOS via USSD, so that I can access emergency features without a smartphone.

#### Acceptance Criteria

1. WHEN a user selects the SOS option from the USSD menu, THE USSD_Service SHALL request confirmation before proceeding
2. WHEN a user confirms SOS activation, THE USSD_Service SHALL trigger the SOS_System with the user's phone number and last known location
3. THE USSD_Service SHALL send an immediate SMS confirmation to the user with emergency contact details
4. WHEN GPS location is unavailable, THE USSD_Service SHALL use cell tower triangulation to estimate the user's position
5. THE USSD_Service SHALL provide a follow-up menu option to cancel false alarms within 2 minutes of activation

### Requirement 10: RTSA Government Dashboard for Fleet Monitoring

**User Story:** As an RTSA official, I want to monitor all active buses on a 3D map, so that I can oversee the transport sector and identify safety issues in real-time.

#### Acceptance Criteria

1. WHEN an RTSA official logs into the dashboard, THE RTSA_Dashboard SHALL display all active journeys on a 3D map
2. THE RTSA_Dashboard SHALL update bus positions in real-time using WebSocket connections
3. WHEN an RTSA official selects a bus, THE RTSA_Dashboard SHALL display journey details, passenger count, driver information, and recent safety events
4. THE RTSA_Dashboard SHALL provide filters for operators, routes, and safety alert types
5. THE RTSA_Dashboard SHALL display a live feed of safety alerts including speeding, route deviations, and SOS events
6. THE RTSA_Dashboard SHALL allow officials to export compliance reports in PDF and CSV formats
7. THE RTSA_Dashboard SHALL require multi-factor authentication for all access
8. THE RTSA_Dashboard SHALL log all official actions with timestamps and user IDs for audit purposes

### Requirement 11: Operator Compliance Scoring System

**User Story:** As an RTSA official, I want to see compliance scores for each operator, so that I can identify problematic operators and take regulatory action.

#### Acceptance Criteria

1. THE Compliance_Scorer SHALL calculate a score from 0 to 100 for each operator based on safety metrics
2. THE Compliance_Scorer SHALL initialize new operators with a score of 100
3. WHEN a safety violation occurs, THE Compliance_Scorer SHALL deduct points according to violation severity
4. THE Compliance_Scorer SHALL deduct 2 points for speed violations, 5 points for route deviations, and 10 points for unresolved SOS events
5. THE Compliance_Scorer SHALL increase scores by 1 point per day of violation-free operation, up to a maximum of 100
6. WHEN an operator's score falls below 70, THE Compliance_Scorer SHALL flag the operator for review
7. WHEN an operator's score falls below 50, THE Compliance_Scorer SHALL recommend suspension to RTSA officials
8. THE RTSA_Dashboard SHALL display compliance score trends over time with monthly aggregations
9. FOR ALL operators, the compliance score SHALL remain between 0 and 100 inclusive (invariant property)

### Requirement 12: Driver Journey Management

**User Story:** As a driver, I want to start and end journeys through the app, so that the system knows when to track my bus and when passengers can board.

#### Acceptance Criteria

1. WHEN a driver logs into the Driver_App, THE Driver_App SHALL display scheduled journeys for the current day
2. WHEN a driver selects a journey and taps "Start Journey", THE Driver_App SHALL activate the GPS_Tracker and notify all booked passengers
3. WHEN a driver starts a journey, THE Backend_API SHALL update the journey status to "active" and make it visible on tracking interfaces
4. WHEN a driver taps "End Journey", THE Driver_App SHALL stop the GPS_Tracker and mark the journey as completed
5. THE Driver_App SHALL prevent starting a journey more than 30 minutes before scheduled departure time
6. THE Driver_App SHALL display passenger count, route details, and next stop information during active journeys
7. WHEN a driver marks a stop as reached, THE Driver_App SHALL notify passengers waiting at that stop

### Requirement 13: Offline GPS Data Buffering

**User Story:** As a driver traveling through areas with poor network coverage, I want the app to store GPS data locally, so that tracking continues seamlessly when connectivity is restored.

#### Acceptance Criteria

1. WHEN network connectivity is unavailable, THE GPS_Tracker SHALL store location data in the Offline_Buffer
2. THE Offline_Buffer SHALL store up to 1000 location records with timestamps, coordinates, speed, and heading
3. WHEN the Offline_Buffer reaches capacity, THE GPS_Tracker SHALL overwrite the oldest records
4. WHEN network connectivity is restored, THE GPS_Tracker SHALL transmit buffered data in chronological order
5. THE GPS_Tracker SHALL mark transmitted records as synchronized and remove them from the Offline_Buffer
6. THE Driver_App SHALL display buffer status including record count and oldest record timestamp
7. WHEN a journey ends with unsynchronized data, THE GPS_Tracker SHALL continue attempting transmission until successful or 24 hours elapse
8. FOR ALL buffered records, transmitting then re-buffering SHALL preserve the original timestamps (round-trip property)

### Requirement 14: Passenger Booking Confirmation and QR Codes

**User Story:** As a passenger, I want to receive a QR code for my booking, so that I can board the bus quickly without paper tickets.

#### Acceptance Criteria

1. WHEN a booking is confirmed, THE Booking_System SHALL generate a unique QR code containing the booking reference
2. THE Passenger_App SHALL display the QR code in the booking details screen
3. THE Booking_System SHALL send the QR code via SMS to passengers who booked through USSD
4. WHEN a driver scans a QR code, THE Driver_App SHALL validate the booking and mark the passenger as boarded
5. THE Driver_App SHALL display passenger name, seat number, and booking status after scanning
6. WHEN a QR code is scanned for a canceled or expired booking, THE Driver_App SHALL display an error message
7. THE Booking_System SHALL prevent duplicate boarding by rejecting QR codes that have already been scanned
8. FOR ALL valid bookings, generating a QR code then scanning it SHALL retrieve the original booking details (round-trip property)

### Requirement 15: Route and Schedule Management

**User Story:** As an operator, I want to define routes and schedules, so that passengers can book seats on my buses.

#### Acceptance Criteria

1. WHEN an operator creates a route, THE Backend_API SHALL require origin, destination, waypoints, and distance
2. THE Backend_API SHALL validate that all waypoints form a continuous path
3. WHEN an operator creates a schedule, THE Backend_API SHALL require route, departure time, arrival time, and pricing
4. THE Backend_API SHALL prevent overlapping schedules for the same vehicle
5. WHEN an operator updates a route, THE Backend_API SHALL notify all passengers with future bookings on that route
6. THE Backend_API SHALL allow operators to mark routes as inactive without deleting historical data
7. THE Backend_API SHALL calculate Speed_Threshold values for each route segment based on road type

### Requirement 16: WebSocket Real-Time Communication

**User Story:** As a passenger, I want to receive instant updates about my journey, so that I have the most current information without refreshing the app.

#### Acceptance Criteria

1. WHEN a passenger opens a journey tracking screen, THE Passenger_App SHALL establish a WebSocket connection to the Backend_API
2. WHEN the Backend_API receives GPS data from a driver, THE Backend_API SHALL broadcast the position to all connected passengers on that journey within 1 second
3. WHEN a safety alert is triggered, THE Backend_API SHALL broadcast the alert to all connected passengers immediately
4. WHEN a WebSocket connection is interrupted, THE Passenger_App SHALL attempt reconnection with exponential backoff up to 5 attempts
5. THE Backend_API SHALL authenticate WebSocket connections using JWT tokens
6. WHEN a journey ends, THE Backend_API SHALL close all WebSocket connections for that journey
7. THE Backend_API SHALL limit each passenger to 3 concurrent WebSocket connections to prevent abuse

### Requirement 17: SMS Notifications for Critical Events

**User Story:** As a passenger, I want to receive SMS notifications for important updates, so that I stay informed even when not using the app.

#### Acceptance Criteria

1. WHEN a booking is confirmed, THE Backend_API SHALL send an SMS with booking reference, journey details, and QR code link
2. WHEN a journey is about to start, THE Backend_API SHALL send an SMS reminder 30 minutes before departure
3. WHEN a safety alert occurs on a passenger's journey, THE Backend_API SHALL send an SMS with alert details
4. WHEN a journey is canceled by the operator, THE Backend_API SHALL send an SMS notification and initiate automatic refund
5. WHEN a refund is processed, THE Backend_API SHALL send an SMS confirmation with transaction details
6. THE Backend_API SHALL integrate directly with telecom operator SMS gateways (Airtel, MTN, Zamtel) for message delivery
7. THE Backend_API SHALL log all SMS deliveries with status codes and timestamps

### Requirement 18: Emergency Contact Management

**User Story:** As a passenger, I want to designate emergency contacts, so that they are notified if I trigger an SOS alert.

#### Acceptance Criteria

1. THE Passenger_App SHALL allow passengers to add up to 5 Emergency_Contacts with names and phone numbers
2. THE Passenger_App SHALL validate phone numbers using Zambian mobile number format
3. WHEN a passenger adds an Emergency_Contact, THE Passenger_App SHALL send a verification SMS to that contact
4. THE Passenger_App SHALL allow passengers to edit or remove Emergency_Contacts at any time
5. WHEN an SOS is triggered, THE SOS_System SHALL notify all verified Emergency_Contacts simultaneously
6. THE Passenger_App SHALL display the status of each Emergency_Contact (verified or pending verification)

### Requirement 19: Shared Tracking Links for Non-Users

**User Story:** As a passenger, I want to share a tracking link with family or friends, so that they can monitor my journey without installing the app.

#### Acceptance Criteria

1. WHEN a passenger taps "Share Journey", THE Passenger_App SHALL generate a unique tracking URL
2. THE Tracking_Link SHALL display the 3D map with real-time bus position without requiring authentication
3. THE Tracking_Link SHALL remain valid for the duration of the journey plus 2 hours
4. THE Tracking_Link SHALL display journey details including route, departure time, and estimated arrival
5. WHEN a journey ends, THE Tracking_Link SHALL display a completion message with actual arrival time
6. THE Tracking_Link SHALL work on all modern web browsers without requiring plugins
7. THE Backend_API SHALL limit each tracking link to 50 concurrent viewers to prevent abuse
8. THE Tracking_Link SHALL update bus position in real-time using WebSocket connections

### Requirement 20: Driver Authentication and Authorization

**User Story:** As an operator, I want only authorized drivers to access the Driver_App, so that I can ensure accountability and prevent unauthorized use.

#### Acceptance Criteria

1. WHEN a driver attempts to log in, THE Backend_API SHALL verify credentials against the driver database
2. THE Backend_API SHALL require drivers to have a valid license number and operator association
3. WHEN a driver logs in successfully, THE Backend_API SHALL issue a JWT token valid for 24 hours
4. THE Driver_App SHALL store the JWT token securely using platform-specific secure storage
5. WHEN a JWT token expires, THE Driver_App SHALL prompt the driver to re-authenticate
6. THE Backend_API SHALL allow operators to deactivate driver accounts immediately
7. WHEN a driver account is deactivated, THE Backend_API SHALL revoke all active JWT tokens for that driver
8. THE Backend_API SHALL log all driver authentication attempts with timestamps and IP addresses

### Requirement 21: Passenger Rating and Feedback System

**User Story:** As a passenger, I want to rate my journey and provide feedback, so that operators can improve service quality.

#### Acceptance Criteria

1. WHEN a journey ends, THE Passenger_App SHALL prompt the passenger to rate the journey on a scale of 1 to 5 stars
2. THE Passenger_App SHALL allow passengers to provide optional text feedback
3. WHEN a passenger submits a rating below 3 stars, THE Passenger_App SHALL request specific feedback categories
4. THE Backend_API SHALL associate ratings with the driver, vehicle, and operator
5. THE Backend_API SHALL calculate average ratings for drivers and operators updated daily
6. THE RTSA_Dashboard SHALL display operator ratings alongside compliance scores
7. WHEN an operator receives an average rating below 3 stars over 30 days, THE Backend_API SHALL notify RTSA officials

### Requirement 22: Vehicle and Fleet Management

**User Story:** As an operator, I want to manage my fleet of vehicles, so that I can assign buses to routes and track vehicle performance.

#### Acceptance Criteria

1. WHEN an operator adds a vehicle, THE Backend_API SHALL require registration number, capacity, and vehicle type
2. THE Backend_API SHALL validate that registration numbers are unique across the platform
3. WHEN an operator assigns a vehicle to a journey, THE Backend_API SHALL verify the vehicle is not already assigned to an overlapping journey
4. THE Backend_API SHALL track total distance traveled and journey count for each vehicle
5. THE Backend_API SHALL allow operators to mark vehicles as under maintenance, making them unavailable for assignment
6. THE Backend_API SHALL display vehicle utilization metrics including active hours and revenue per vehicle
7. WHEN a vehicle accumulates 5 or more safety violations in 30 days, THE Backend_API SHALL flag it for inspection

### Requirement 23: ZICTA Short Code and Telecom Integration

**User Story:** As a system administrator, I want to integrate with ZICTA's short code allocation system and telecom operators directly, so that the USSD service uses an officially assigned short code across all networks.

#### Acceptance Criteria

1. THE USSD_Service SHALL use the ZICTA-assigned short code \*147# for all USSD interactions
2. THE Backend_API SHALL establish direct USSD gateway connections with Airtel, MTN, and Zamtel using their respective APIs
3. THE Backend_API SHALL handle ZICTA harmonization requests for short code conflicts
4. THE Backend_API SHALL log all USSD sessions with session IDs, network operator, and ZICTA compliance metadata
5. THE Backend_API SHALL submit monthly usage reports to ZICTA in the required format
6. WHEN ZICTA requests short code suspension, THE Backend_API SHALL disable the USSD_Service within 1 hour
7. THE Backend_API SHALL maintain separate connection pools for each telecom operator to ensure service isolation
8. THE Backend_API SHALL implement automatic failover between telecom operators if one gateway becomes unavailable

### Requirement 24: Payment Transaction Reconciliation

**User Story:** As an operator, I want to reconcile payment transactions, so that I can verify revenue and identify discrepancies.

#### Acceptance Criteria

1. THE Backend_API SHALL record all payment transactions with booking reference, amount, timestamp, and payment provider
2. THE Backend_API SHALL generate daily reconciliation reports comparing platform records with mobile money provider statements
3. WHEN a discrepancy is detected, THE Backend_API SHALL flag the transaction for manual review
4. THE Backend_API SHALL allow operators to export transaction reports in CSV format
5. THE Backend_API SHALL calculate operator revenue after deducting platform commission of 5%
6. THE Backend_API SHALL process operator payouts weekly via mobile money
7. FOR ALL transactions, the sum of operator revenue and platform commission SHALL equal the total payment amount (invariant property)

### Requirement 25: API Rate Limiting and Security

**User Story:** As a system administrator, I want to implement rate limiting on API endpoints, so that the platform is protected from abuse and denial-of-service attacks.

#### Acceptance Criteria

1. THE Backend_API SHALL limit unauthenticated requests to 100 requests per IP address per hour
2. THE Backend_API SHALL limit authenticated requests to 1000 requests per user per hour
3. WHEN a rate limit is exceeded, THE Backend_API SHALL return HTTP 429 status with retry-after header
4. THE Backend_API SHALL implement exponential backoff for repeated rate limit violations
5. THE Backend_API SHALL whitelist RTSA IP addresses from rate limiting
6. THE Backend_API SHALL use Redis for distributed rate limiting across multiple server instances
7. THE Backend_API SHALL log all rate limit violations with IP address, user ID, and endpoint

### Requirement 26: Data Backup and Recovery

**User Story:** As a system administrator, I want automated database backups, so that data can be recovered in case of system failure.

#### Acceptance Criteria

1. THE Backend_API SHALL perform automated PostgreSQL backups every 6 hours
2. THE Backend_API SHALL store backups in AWS S3 with encryption at rest
3. THE Backend_API SHALL retain daily backups for 30 days and monthly backups for 1 year
4. THE Backend_API SHALL verify backup integrity by performing test restores weekly
5. WHEN a backup fails, THE Backend_API SHALL send alert notifications to system administrators
6. THE Backend_API SHALL document recovery procedures with target recovery time of 4 hours
7. THE Backend_API SHALL backup Redis cache data daily for session recovery

### Requirement 27: Multi-Language Support

**User Story:** As a passenger, I want to use the app in my preferred language, so that I can understand all features and instructions.

#### Acceptance Criteria

1. THE Passenger_App SHALL support English, Bemba, and Nyanja languages
2. THE Passenger_App SHALL detect the device language and set it as default
3. THE Passenger_App SHALL allow passengers to change language from settings
4. WHEN a passenger changes language, THE Passenger_App SHALL update all UI text immediately without restart
5. THE USSD_Service SHALL support language selection in the main menu
6. THE Backend_API SHALL send SMS notifications in the passenger's preferred language
7. THE Backend_API SHALL store language preference in the user profile

### Requirement 28: Audit Trail and Compliance Logging

**User Story:** As an RTSA official, I want comprehensive audit logs of all system activities, so that I can investigate incidents and ensure regulatory compliance.

#### Acceptance Criteria

1. THE Backend_API SHALL log all user authentication events with timestamps, IP addresses, and user agents
2. THE Backend_API SHALL log all booking transactions with passenger ID, operator ID, amount, and payment status
3. THE Backend_API SHALL log all safety events with GPS coordinates, severity, and resolution status
4. THE Backend_API SHALL log all RTSA dashboard actions with official ID and action type
5. THE Backend_API SHALL store audit logs in a separate database with write-only access
6. THE Backend_API SHALL retain audit logs for 7 years to comply with Zambian data retention regulations
7. THE RTSA_Dashboard SHALL provide audit log search and export functionality
8. THE Backend_API SHALL generate tamper-evident log hashes to ensure log integrity

### Requirement 29: Network Resilience and Failover

**User Story:** As a system administrator, I want the platform to handle server failures gracefully, so that service remains available during outages.

#### Acceptance Criteria

1. THE Backend_API SHALL deploy across multiple AWS availability zones for redundancy
2. WHEN a server instance fails, THE Backend_API SHALL automatically route traffic to healthy instances within 30 seconds
3. THE Backend_API SHALL use AWS RDS Multi-AZ deployment for PostgreSQL database failover
4. THE Backend_API SHALL use Redis Cluster with automatic failover for cache and session management
5. THE Backend_API SHALL implement health check endpoints returning HTTP 200 when all dependencies are operational
6. WHEN a dependency fails, THE Backend_API SHALL return HTTP 503 and trigger automated alerts
7. THE Backend_API SHALL maintain 99.9% uptime measured monthly

### Requirement 30: Performance Monitoring and Alerting

**User Story:** As a system administrator, I want real-time performance monitoring, so that I can identify and resolve issues before they impact users.

#### Acceptance Criteria

1. THE Backend_API SHALL track response times for all API endpoints with 95th percentile metrics
2. THE Backend_API SHALL monitor database query performance and identify slow queries exceeding 1 second
3. THE Backend_API SHALL track WebSocket connection counts and message throughput
4. WHEN API response time exceeds 2 seconds for 5 consecutive requests, THE Backend_API SHALL trigger an alert
5. WHEN database connection pool utilization exceeds 80%, THE Backend_API SHALL trigger an alert
6. THE Backend_API SHALL integrate with CloudWatch for centralized monitoring and alerting
7. THE Backend_API SHALL provide a real-time dashboard displaying active users, active journeys, and system health metrics

### Requirement 31: Booking Modification and Seat Changes

**User Story:** As a passenger, I want to modify my booking or change seats, so that I can adjust my travel plans without canceling and rebooking.

#### Acceptance Criteria

1. WHEN a passenger requests a seat change, THE Booking_System SHALL display available seats on the same journey
2. WHEN a passenger selects a new seat, THE Booking_System SHALL update the booking without additional payment if the price is the same
3. WHEN a passenger selects a higher-priced seat, THE Booking_System SHALL request payment for the price difference
4. WHEN a passenger selects a lower-priced seat, THE Booking_System SHALL issue a partial refund
5. THE Booking_System SHALL allow seat changes up to 1 hour before departure
6. WHEN a passenger changes journey date or time, THE Booking_System SHALL treat it as a new booking with cancellation of the original
7. THE Booking_System SHALL send SMS confirmation for all booking modifications

### Requirement 32: Driver Performance Analytics

**User Story:** As an operator, I want to view driver performance metrics, so that I can identify top performers and provide targeted training.

#### Acceptance Criteria

1. THE Backend_API SHALL track safety violations, on-time performance, and passenger ratings for each driver
2. THE Backend_API SHALL calculate a driver performance score from 0 to 100 based on weighted metrics
3. THE Backend_API SHALL weight the performance score as: 40% safety record, 30% on-time performance, 30% passenger ratings
4. THE Backend_API SHALL generate monthly driver performance reports for operators
5. WHEN a driver's performance score falls below 60, THE Backend_API SHALL recommend retraining
6. THE Backend_API SHALL display driver rankings within each operator's fleet
7. THE Backend_API SHALL allow operators to export driver performance data in CSV format

### Requirement 33: Passenger Notification Preferences

**User Story:** As a passenger, I want to control which notifications I receive, so that I only get alerts relevant to me.

#### Acceptance Criteria

1. THE Passenger_App SHALL provide notification settings for booking confirmations, journey reminders, safety alerts, and promotional messages
2. THE Passenger_App SHALL allow passengers to enable or disable each notification type independently
3. THE Passenger_App SHALL allow passengers to choose notification delivery method: push notification, SMS, or both
4. WHEN a passenger disables safety alerts, THE Passenger_App SHALL display a warning about missing critical information
5. THE Backend_API SHALL respect notification preferences for all communications except SOS alerts
6. THE Backend_API SHALL always send SOS alerts regardless of notification preferences
7. THE Passenger_App SHALL sync notification preferences across devices for the same user account

### Requirement 34: Journey History and Receipts

**User Story:** As a passenger, I want to view my journey history and download receipts, so that I can track my travel expenses and claim reimbursements.

#### Acceptance Criteria

1. THE Passenger_App SHALL display a chronological list of all completed journeys with dates, routes, and amounts
2. WHEN a passenger selects a journey, THE Passenger_App SHALL display detailed information including departure time, arrival time, and payment method
3. THE Passenger_App SHALL allow passengers to download PDF receipts for any completed journey
4. THE Backend_API SHALL generate receipts containing booking reference, journey details, payment breakdown, and operator information
5. THE Passenger_App SHALL allow passengers to filter journey history by date range, route, or operator
6. THE Passenger_App SHALL display total spending per month and year
7. THE Backend_API SHALL retain journey history for 3 years for passenger access

### Requirement 35: Operator Dashboard and Analytics

**User Story:** As an operator, I want a dashboard showing business metrics, so that I can make data-driven decisions about routes and pricing.

#### Acceptance Criteria

1. THE Backend_API SHALL provide a web dashboard for operators displaying revenue, bookings, and occupancy rates
2. THE Backend_API SHALL display daily, weekly, and monthly revenue trends with graphical visualizations
3. THE Backend_API SHALL calculate occupancy rate as the percentage of booked seats versus total available seats
4. THE Backend_API SHALL identify top-performing and underperforming routes based on revenue and occupancy
5. THE Backend_API SHALL display upcoming journeys with current booking status
6. THE Backend_API SHALL allow operators to export analytics data in CSV and PDF formats
7. THE Backend_API SHALL provide route profitability analysis including revenue, estimated fuel costs, and driver wages

### Requirement 36: Dynamic Pricing and Promotions

**User Story:** As an operator, I want to offer promotional pricing and discounts, so that I can attract more passengers during off-peak times.

#### Acceptance Criteria

1. THE Backend_API SHALL allow operators to create promotional codes with percentage or fixed-amount discounts
2. WHEN a passenger applies a promotional code, THE Booking_System SHALL validate the code and apply the discount
3. THE Backend_API SHALL allow operators to set validity periods and usage limits for promotional codes
4. THE Backend_API SHALL prevent stacking multiple promotional codes on a single booking
5. THE Backend_API SHALL track promotional code usage and calculate redemption rates
6. THE Backend_API SHALL allow operators to set dynamic pricing based on demand and time until departure
7. WHEN demand is high, THE Booking_System SHALL increase prices by up to 50% of base fare
8. WHEN demand is low within 24 hours of departure, THE Booking_System SHALL decrease prices by up to 30% of base fare

### Requirement 37: Accessibility Features for Passengers with Disabilities

**User Story:** As a passenger with disabilities, I want accessible booking and tracking features, so that I can use the platform independently.

#### Acceptance Criteria

1. THE Passenger_App SHALL support screen readers on iOS and Android platforms
2. THE Passenger_App SHALL provide high-contrast mode for visually impaired users
3. THE Passenger_App SHALL support font size adjustment from 100% to 200%
4. THE Passenger_App SHALL allow passengers to indicate wheelchair accessibility requirements during booking
5. THE Booking_System SHALL filter and display only wheelchair-accessible vehicles when requested
6. THE Backend_API SHALL track wheelchair-accessible vehicle availability for each operator
7. THE Passenger_App SHALL provide voice-guided navigation for critical booking steps
8. THE USSD_Service SHALL support text-to-speech output for visually impaired users on compatible devices

### Requirement 38: Incident Reporting and Resolution

**User Story:** As a passenger, I want to report incidents during my journey, so that operators and authorities can address safety concerns.

#### Acceptance Criteria

1. THE Passenger_App SHALL provide an incident reporting feature accessible during and after journeys
2. WHEN a passenger reports an incident, THE Passenger_App SHALL request incident type, description, and optional photo evidence
3. THE Backend_API SHALL categorize incidents as: safety violation, driver behavior, vehicle condition, or other
4. WHEN an incident is reported, THE Backend_API SHALL notify the operator and log the incident with timestamp and GPS location
5. WHEN an incident is categorized as safety violation, THE Backend_API SHALL notify the RTSA_Dashboard immediately
6. THE Backend_API SHALL allow operators to respond to incident reports with resolution notes
7. THE Backend_API SHALL track incident resolution time and include it in operator compliance metrics
8. THE RTSA_Dashboard SHALL display all unresolved incidents with aging indicators

### Requirement 39: GPS Data Privacy and Retention

**User Story:** As a driver, I want assurance that my GPS data is handled securely, so that my privacy is protected outside of working hours.

#### Acceptance Criteria

1. THE GPS_Tracker SHALL only collect location data during active journeys
2. THE Backend_API SHALL retain GPS data for 90 days for safety investigations and compliance
3. THE Backend_API SHALL anonymize GPS data older than 90 days by removing driver and vehicle identifiers
4. THE Backend_API SHALL encrypt GPS data at rest using AES-256 encryption
5. THE Backend_API SHALL encrypt GPS data in transit using TLS 1.3
6. THE Backend_API SHALL restrict GPS data access to authorized personnel only
7. THE Backend_API SHALL log all GPS data access requests with user ID and purpose
8. THE Driver_App SHALL display a privacy notice explaining GPS data collection and retention policies
