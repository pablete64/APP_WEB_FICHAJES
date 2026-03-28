#!/bin/bash

# start_all.sh
# Script to run both backend and frontend concurrently for demo purposes

# Configurar para detenerse en caso de error y tuberías rotas
set -euo pipefail

echo "🚀 Iniciando Time Flow (Back + Front)..."

# Función para esperar que un puerto esté abierto
wait_for_port() {
  local host=$1
  local port=$2
  local name=$3
  local timeout=30
  local count=0
  
  echo "⏳ Esperando que $name ($host:$port) esté listo..."
  while ! nc -z "$host" "$port" 2>/dev/null; do
    sleep 1
    count=$((count + 1))
    if [ $count -ge $timeout ]; then
      echo "❌ ERROR: Tiempo de espera agotado para $name ($host:$port)."
      return 1
    fi
  done
  echo "✅ $name está listo!"
}

# 1. Alimentar base de datos
echo "Verificando semilla de base de datos..."
cd backend
source venv/bin/activate || echo "⚠️  No venv found, usando entorno global"
python seed_demo.py
echo "Semilla de base de datos finalizada."

# 2. Levantar Backend en background
echo "Levantando Backend (FastAPI)..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Breve espera para verificar que no muere instantáneamente (ej: puertos ocupados)
sleep 2
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  echo "❌ ERROR: El proceso Backend falló al arrancar. Revisa si el puerto 8000 está ocupado."
  exit 1
fi

wait_for_port localhost 8000 "Backend"

# 3. Levantar Frontend en background
cd ..
echo "Levantando Frontend (Vite)..."
npm run dev &
FRONTEND_PID=$!

sleep 2
if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
  echo "❌ ERROR: El proceso Frontend falló al arrancar. Revisa si el puerto 8080 está ocupado."
  kill "$BACKEND_PID" 2>/dev/null || true
  exit 1
fi

wait_for_port localhost 8080 "Frontend"

cleanup() {
    echo -e "\n🛑 Apagando servidores..."
    # Se añade || true para evitar fallos de set -e al matar procesos que ya murieron
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    echo "Servicios finalizados."
}
trap cleanup EXIT INT TERM

echo ""
echo "📱 Los servicios están levantados:"
echo "- Backend: http://localhost:8000"
echo "- Frontend: http://localhost:8080"
echo ""
echo "Presiona Ctrl+C para apagar los servidores de forma segura."

# Supervisar si alguno de los dos muere durante la ejecución
while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
    sleep 2
done

echo "⚠️  Uno de los servidores se ha detenido inesperadamente. Apagando..."
