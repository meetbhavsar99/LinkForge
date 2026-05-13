# LinkForge

An URL shortener to mainly create branded short links. It tracks which links get clicked. It tries to solve real distributed concerns, such as, consistent hashing for short-code generation, Redis caching on the read path, click-stream analytics via async processing, and rate limiting.

## Tech Stack

Node.js, Express, PostgreSQL, Redis, GraphQL, JWT, AWS (EC2/RDS), Docker, Prisma, TypeScript

## Architecture Diagram

## Setup instructions

## API Documentation

## Design Decisions

## Demo

## Features

- GraphQL API for creating, reading, and deleting short URLs (query + mutation patterns)
- Base62-encoded short codes using a counter-based approach with collision handling
- Redis read-through cache for redirect lookups (the system is 100:1 read-heavy)
- Async click analytics: log each redirect event to a queue (Bull/BullMQ on Redis), process in background workers to aggregate into PostgreSQL
- Rate limiting middleware (token bucket per API key)
- JWT-authenticated user accounts with API key management
- Analytics dashboard endpoint: clicks over time, geographic breakdown (via IP geolocation), referrer tracking
- Link expiration with TTL-based cleanup (pg_cron or scheduled worker)
