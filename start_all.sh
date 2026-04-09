#!/bin/bash

# start_all.sh
# Script to build, start and seed the application using Docker

echo "🚀 Starting TimeFlow App with Docker..."

# 1. Build and start containers
echo "📦 Building and starting containers..."
docker compose up --build -d

# 2. Wait for backend to be ready
echo "⏳ Waiting for backend to be ready (migrations, etc.)..."
# Give it a bit of time for migrations to run in the entrypoint
sleep 5

# 3. Seed data
echo "🔐 Seeding production admin users..."
docker compose exec backend bash -c "export PYTHONPATH=/app && python scripts/seeds/seed_admins.py"

echo "🌱 Seeding official tasks..."
docker compose exec backend bash -c "export PYTHONPATH=/app && python scripts/seeds/seed_tasks.py"

echo "🌱 Seeding Demo data..."
docker compose exec backend bash -c "export PYTHONPATH=/app && python scripts/seeds/seed_demo.py"

echo "🌱 Seeding Mango project data..."
docker compose exec backend bash -c "export PYTHONPATH=/app && python scripts/seeds/seed_mango.py"

echo ""
echo "✨ Everything is up and running!"
echo "🔗 Frontend: http://localhost"
echo "🔗 API Docs: http://localhost:8000/docs"
echo ""
echo "Logs can be followed with: docker compose logs -f"
