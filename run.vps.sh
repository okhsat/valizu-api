#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

COMPOSE_FILES=(
    -f docker-compose.yml
    -f docker-compose.vps.yml
)

DOCKER=(docker)
COMPOSE=()

###############################################################################
# Docker
###############################################################################

install_docker() {
    if command -v docker >/dev/null 2>&1 &&
       docker compose version >/dev/null 2>&1; then
        echo "==> Docker and Docker Compose already installed"
        return
    fi

    echo "==> Installing Docker Engine and Compose plugin"

    sudo apt-get update

    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg

    sudo install -m 0755 -d /etc/apt/keyrings

    if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
        sudo curl -fsSL \
            https://download.docker.com/linux/ubuntu/gpg \
            -o /etc/apt/keyrings/docker.asc

        sudo chmod a+r /etc/apt/keyrings/docker.asc
    fi

    . /etc/os-release

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
      https://download.docker.com/linux/ubuntu \
      ${VERSION_CODENAME} stable" |
      sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

    sudo apt-get update

    sudo apt-get install -y \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin

    sudo systemctl enable --now docker

    echo "==> Docker installation completed"
}

docker_available() {
    "${DOCKER[@]}" info >/dev/null 2>&1
}

configure_docker_access() {
    if docker_available; then
        echo "==> Docker is accessible"
        return
    fi

    if sudo docker info >/dev/null 2>&1; then
        echo "==> Using Docker through sudo"
        DOCKER=(sudo docker)
        return
    fi

    echo "ERROR: Docker daemon is not accessible."
    exit 1
}

configure_compose() {
    COMPOSE=(
        "${DOCKER[@]}"
        compose
        "${COMPOSE_FILES[@]}"
    )
}

###############################################################################
# Environment
###############################################################################

prepare_environment() {
    echo "==> Preparing environment"

    if [[ ! -f .env ]]; then
        echo "==> Creating .env from .env.example"

        cp .env.example .env

        POSTGRES_PASSWORD="$(openssl rand -hex 24)"

        sed -i \
            "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${POSTGRES_PASSWORD}/" \
            .env
    else
        echo "==> .env already exists"
    fi

    set -a
    source .env
    set +a
}

###############################################################################
# Deployment
###############################################################################

deploy() {
    echo "==> Validating Docker Compose configuration"

    "${COMPOSE[@]}" config >/dev/null

    echo "==> Building and starting Valizu"

    "${COMPOSE[@]}" up -d --build

    echo "==> Waiting for PostgreSQL"

    until "${COMPOSE[@]}" exec -T postgres \
        pg_isready \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        >/dev/null 2>&1
    do
        sleep 2
    done

    echo "==> PostgreSQL is ready"

    echo "==> Running Prisma migrations"

    "${COMPOSE[@]}" exec -T api \
        pnpm prisma migrate deploy

    echo "==> Running idempotent seed"

    "${COMPOSE[@]}" exec -T api \
        pnpm seed:prod
}

###############################################################################
# Main
###############################################################################

install_docker
configure_docker_access
configure_compose
prepare_environment
deploy

echo
echo "============================================================"
echo " Valizu VPS deployment completed"
echo "============================================================"
echo

"${COMPOSE[@]}" ps

echo
echo "API:"
echo "http://api.valizu.turandevelop.com"
