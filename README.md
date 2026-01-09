# KTch-Interview-Round-1-Case-Back-End

This repository contains my solution for the **KTch Backend Interview Case Study**.

The goal of this project is to design and implement a RESTful backend API following the **exact specifications provided in the PDF**, with strict attention to HTTP semantics, authorization rules, response formatting, and error handling.

---

# Tech Stack

- Node.js
- Express
- SQLite (better-sqlite3)
- Jest + Supertest
- ES Modules

## Running the Project

### Install dependencies
```bash
npm install
```
Start the server
```bash
npm run dev
```
The server runs at:
```bash
http://localhost:3000
```
Health check:
```bash
GET /health
```
### Running Tests
```bash
npm test
```
### Tests cover:

Global middleware rules

HTTP error codes (406, 415, 400, 401)

Authorization header validation

Tests were written incrementally alongside development.

Authentication Model
Authentication is simulated using the Authorization header.

Example:
```bash
Authorization: Bearer user1
```
The token value maps to an internal auth_sub and is used to enforce resource ownership.

# API Resources
### Users

Create user

List users

Get user by ID (ownership enforced)

Delete user

Add / remove friends

### Arts

Create art (owned by user)

List arts (pagination)

Get art by ID (ownership enforced)

PATCH / PUT updates

Delete art

### Galleries

Create gallery

List galleries (pagination)

Get gallery by ID (ownership enforced)

PATCH / PUT updates

Delete gallery

Add / remove art from gallery



#### All endpoints strictly follow the rules defined in the case study.



### Design Decisions

Middleware is applied globally to enforce API rules consistently

Serialization helpers ensure exact response formatting

SQLite is used for deterministic behavior

Validation logic is explicit and readable

