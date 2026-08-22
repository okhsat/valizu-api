# Valizu Backend API

Backend implementation for the Percon Bilişim Çözümleri ve Danışmanlık backend case study.

The project implements a RESTful API for managing users, trips, bags, and items, with particular attention to data integrity, transaction boundaries, validation, ownership, idempotency, and concurrent requests.

## Tech Stack

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- Prisma ORM
- Zod
- OpenAPI 3.0.3
- Swagger UI
- Vitest
- Docker / Docker Compose
- pnpm

## Architecture

The project follows a modular service-oriented structure:

    src/
    ├── lib/
    │   └── prisma.ts
    ├── middleware/
    │   ├── error.handler.ts
    │   └── auth.ts
    ├── modules/
    │   ├── trips/
    │   │   ├── trip.routes.ts
    │   │   ├── trip.schemas.ts
    │   │   └── trip.service.ts
    │   ├── bags/
    │   │   ├── bag.routes.ts
    │   │   ├── bag.schemas.ts
    │   │   └── bag.service.ts
    │   ├── items/
    │   │   ├── item.routes.ts
    │   │   ├── item.schemas.ts
    │   │   └── item.service.ts
    │   └── users/
    │   │   ├── user.routes.ts
    │   │   └── user.service.ts
    ├── scripts/
    │   └── seed.ts
    ├── openapi.ts
    └── ...

    prisma/
    ├── schema.prisma
    └── migrations/

    tests/
    └── trips/
        └── copy.trip.test.ts

## Domain Model

The core domain is:

    User
      │
      ├── Trips
      │     │
      │     └── Bags
      │           │
      │           └── BagItems
      │                 │
      │                 └── Items
      │
      └── Items

A user owns trips and items.

A trip contains bags.

A bag contains items through the BagItem join model.

The BagItem model stores the quantity of each item in a bag.

## Database Model

### User

Represents an API user.

Important fields:

- id
- email
- name
- createdAt
- updatedAt

Email is unique.

### Trip

Represents a user's trip.

Important fields:

- id
- userId
- name
- destination
- startDate
- endDate
- createdAt
- updatedAt

Trips are indexed by userId.

### Bag

Represents a bag belonging to a trip.

Important fields:

- id
- tripId
- name
- createdAt
- updatedAt

Bags are indexed by tripId.

### Item

Represents an item owned by a user.

Important fields:

- id
- userId
- name
- category
- createdAt
- updatedAt

Items are indexed by userId.

### BagItem

Represents the relationship between a bag and an item.

Important fields:

- id
- bagId
- itemId
- quantity
- createdAt
- updatedAt

The database enforces:

    UNIQUE (bagId, itemId)

This prevents the same item from being inserted into the same bag more than once.

### IdempotencyKey

Stores idempotency information for operations that must be safe to retry.

Important fields:

- id
- userId
- key
- operation
- requestHash
- status
- resourceId
- responseBody
- createdAt
- completedAt

The database enforces:

    UNIQUE (userId, operation, key)

This constraint is the primary concurrency guarantee for the Copy Trip operation.

## API Endpoints

### Health

    GET /health

Returns:

    {
      "status": "ok"
    }

### Users

    GET /users

Returns the available users in the case-study dataset.

### Trips

    GET /trips

Returns all trips belonging to the authenticated user.

    POST /trips/{tripId}/copy

Copies an existing trip, including its bags and bag items.

The Copy Trip endpoint requires:

    Idempotency-Key: <unique-key>

### Bags

    GET /trips/{tripId}/bags

Lists the bags belonging to a trip.

    POST /trips/{tripId}/bags

Creates a new bag.

    PATCH /bags/{bagId}

Updates a bag.

### Bag Items

    GET /bags/{bagId}/items

Lists the items currently contained in a bag.

    POST /bags/{bagId}/items

Adds an item to a bag.

If the item already exists in the bag, its quantity is incremented.

    DELETE /bags/{bagId}/items/{itemId}

Removes an item from a bag.

### Items

    GET /items

Returns items belonging to the authenticated user.

## Authentication Model

The case study uses a lightweight authentication mechanism based on:

    X-User-Id

The header identifies the current user.

Example:

    X-User-Id: 11111111-1111-4111-8111-111111111111

This mechanism is intentionally simple because the case study does not require a full authentication/authorization system.

In a production system, this layer could be replaced by JWT/OAuth2/session-based authentication without changing the domain services.

## Ownership and Authorization

User ownership is enforced at the service/data-access level.

For example, retrieving a trip is performed using both:

    tripId
    userId

This prevents a user from accessing another user's resources simply by knowing their UUID.

The same principle is applied to trips, bags, and items.

## Copy Trip and Idempotency

The most important part of the implementation is the Copy Trip operation.

Endpoint:

    POST /trips/{tripId}/copy

Required header:

    Idempotency-Key: <key>

The operation copies:

    Trip
      ├── Bags
      │     ├── BagItem
      │     └── BagItem
      └── Bags ...

### Idempotency Requirement

If the client sends the same request more than once using the same idempotency key, the API must not create multiple copies.

For example:

    POST /trips/123/copy
    Idempotency-Key: abc-123

The first request creates:

    Copy of Istanbul Trip

A retry with:

    Idempotency-Key: abc-123

returns the original result instead of creating another trip.

## Database-Level Concurrency Control

Idempotency is not implemented only with application-level checks.

The database contains the unique constraint:

    @@unique([userId, operation, key])

This is important because application-level logic such as:

    find existing record
    if not found
        create record

is vulnerable to a race condition.

Two concurrent requests can both execute the "find" before either request performs the "create".

Instead, the implementation relies on the database's uniqueness guarantee.

Conceptually:

    Request A ─────┐
                   ├── UNIQUE(userId, operation, key)
    Request B ─────┘

Only one request can successfully create the idempotency record.

The other request receives Prisma error P2002.

The service catches this specific database constraint violation and retrieves the existing idempotency record.

## Transaction Boundary

The idempotency record and copied resources are created inside the same Prisma transaction.

The transaction contains:

1. Create idempotency record.
2. Load source trip.
3. Create copied trip.
4. Create copied bags.
5. Create copied bag items.
6. Store the final response in the idempotency record.
7. Commit.

If any step fails, the complete transaction is rolled back.

This means a failed copy does not leave behind a consumed idempotency key.

For example:

    Source trip does not exist
             ↓
       TRIP_NOT_FOUND
             ↓
       Transaction rollback
             ↓
    Idempotency record does not exist

This allows the client to retry the request later.

## Request Hash

The implementation creates a SHA-256 request hash from:

    COPY_TRIP:<sourceTripId>

The hash is stored with the idempotency record.

If the same idempotency key is later reused for another source trip, the hashes do not match.

The API returns:

    409 Conflict

    IDEMPOTENCY_KEY_REUSED

This prevents accidental or malicious reuse of an idempotency key for a different logical request.

## Why try/catch Is Used

The try/catch block is not the concurrency mechanism.

The database unique constraint is the concurrency mechanism.

The try/catch exists to translate the expected database race outcome:

    Prisma P2002

into the application's idempotency behavior:

    return the previously completed result

Therefore:

    Database constraint
            ↓
    prevents duplicate records
            ↓
    Prisma reports P2002
            ↓
    service catches P2002
            ↓
    existing idempotency result is returned

This separates concurrency control from error handling.

## Atomicity

The Copy Trip operation is atomic.

Either:

    Trip
    + Bags
    + BagItems
    + Idempotency result

are committed together,

or none of them are committed.

This prevents partially copied trips.

## Error Handling

The API uses structured errors.

Example:

    {
      "error": "TRIP_NOT_FOUND",
      "message": "Trip not found"
    }

Validation errors contain additional details:

    {
      "error": "VALIDATION_ERROR",
      "message": "Request validation failed",
      "details": [...]
    }

Examples of domain errors include:

- UNAUTHENTICATED
- TRIP_NOT_FOUND
- BAG_NOT_FOUND
- ITEM_NOT_FOUND
- BAG_ITEM_NOT_FOUND
- IDEMPOTENCY_KEY_REUSED
- IDEMPOTENCY_REQUEST_IN_PROGRESS

## Validation

Request validation is performed using Zod schemas.

The OpenAPI contract documents:

- required fields
- field types
- UUID formats
- string length limits
- minimum quantities
- required headers
- response structures
- error responses

Validation is intentionally performed before business operations reach the database.

## OpenAPI

The API specification is implemented as an OpenAPI 3.0.3 document.

The specification covers:

- endpoints
- request parameters
- request bodies
- response schemas
- authentication header
- idempotency header
- validation errors
- domain errors
- HTTP status codes

Swagger UI is available through the application's configured documentation endpoint.

The OpenAPI source is:

    src/openapi.ts

## Testing

Vitest is used for automated testing.

The main test suite focuses on Copy Trip idempotency.

The test suite verifies:

### Concurrent requests

Two concurrent requests using the same idempotency key produce exactly one copied trip.

### Key reuse

Reusing an idempotency key for a different source trip returns:

    409 IDEMPOTENCY_KEY_REUSED

### Failed copy

A failed copy does not consume the idempotency key.

### Retry

A completed request can be retried and returns exactly the original result.

These tests verify both functional behavior and concurrency guarantees.

Run tests with:

    pnpm test

## Seed Data

The project contains a deterministic seed script.

Run:

    pnpm seed

The seed creates:

- one demo user
- two items
- one trip
- one bag
- two bag items

Demo user:

    email: case@valizu.test
    name: Valizu Case User

Demo trip:

    Istanbul Trip

Destination:

    Istanbul

Dates:

    2026-09-01
    2026-09-05

Bag:

    Carry-on

Items:

    Passport
    Phone Charger

The seed uses fixed UUIDs and upserts, making it repeatable.

## Local Development

Install dependencies:

    pnpm install

Configure the database connection through the environment configuration.

Run Prisma migrations:

    pnpm prisma migrate dev

Seed the database:

    pnpm seed

Start the development server:

    pnpm dev

Build the project:

    pnpm build

Run tests:

    pnpm test

## Docker

The project includes Docker-related configuration for running the API together with PostgreSQL.

A typical deployment consists of:

    API
      │
      └── PostgreSQL

The API container is responsible only for the application runtime.

PostgreSQL remains the source of truth for:

- persistence
- uniqueness
- referential integrity
- transactional atomicity
- concurrency guarantees

## Design Decisions

### PostgreSQL

PostgreSQL was selected because the domain is strongly relational and the Copy Trip requirement benefits from:

- ACID transactions
- unique constraints
- foreign keys
- referential integrity
- predictable concurrency behavior

### Prisma

Prisma provides:

- type-safe database access
- explicit schema modeling
- transactions
- database constraint error handling
- migration support

### UUID

UUIDs are used for primary keys.

This avoids exposing sequential identifiers and makes identifiers suitable for distributed systems.

### Database Constraints

Important invariants are enforced at the database level rather than relying exclusively on application code.

Examples:

    User.email UNIQUE

    BagItem(bagId, itemId) UNIQUE

    IdempotencyKey(userId, operation, key) UNIQUE

### Transactional Copy

Copy Trip uses one transaction because a partial copy is not a valid domain state.

### Stored Response

The successful Copy Trip response is stored in the idempotency record.

This allows retries to return the original result instead of reconstructing a potentially different response.

## Production Considerations

The current authentication mechanism is intentionally simplified for the case study.

For production, I would add:

- JWT/OAuth2 authentication
- role/permission management
- rate limiting
- request correlation IDs
- structured logging
- metrics
- distributed tracing
- security headers
- centralized secret management
- database connection pooling configuration
- API versioning
- automated CI/CD
- migration deployment strategy
- backup and recovery procedures

The Copy Trip idempotency design itself is already based on database-level guarantees and can be used as a foundation for a production implementation.

## API Contract

The OpenAPI specification is the source of truth for the public API contract.

The implementation and Postman collection are intended to remain consistent with this specification.

## Case Study Objectives

The implementation focuses on the following engineering concerns:

- Clean REST API design
- Relational domain modeling
- Ownership enforcement
- Request validation
- Transactional consistency
- Idempotent operations
- Race-condition prevention
- Database-level uniqueness
- Automated testing
- OpenAPI documentation
- Repeatable seed data
- Containerized deployment

## Author

Okhtay Sattari

Software Developer & Architect

Backend Case Study for:

Percon Bilişim Çözümleri ve Danışmanlık
