#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

DOMAIN="${DOMAIN:-api.valizu.turandevelop.com}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
CERTBOT_DIR="${PROJECT_DIR}/nginx/certbot"
CERT_DIR="${CERTBOT_DIR}/conf/live/${DOMAIN}"
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
# HTTPS / Let's Encrypt
###############################################################################

prepare_certbot() {
    echo "==> Preparing Let's Encrypt directories"

    mkdir -p \
        "${CERTBOT_DIR}/www/.well-known/acme-challenge" \
        "${CERTBOT_DIR}/conf"
}

certificate_exists() {
    [[ -f "${CERT_DIR}/fullchain.pem" &&
       -f "${CERT_DIR}/privkey.pem" ]]
}

write_bootstrap_config() {
    echo "==> Creating temporary HTTP-only Nginx configuration"

    cat > nginx/vps.bootstrap.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 10m;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://api:3000;

        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_set_header Connection "";
    }
}
EOF
}

start_bootstrap_nginx() {
    echo "==> Starting Nginx in HTTP/ACME mode"

    cp nginx/vps.conf nginx/vps.final.conf
    cp nginx/vps.bootstrap.conf nginx/vps.conf

    "${COMPOSE[@]}" up -d nginx
}

restore_https_nginx() {
    echo "==> Restoring HTTPS Nginx configuration"

    cp nginx/vps.final.conf nginx/vps.conf

    rm -f nginx/vps.final.conf
    rm -f nginx/vps.bootstrap.conf

    "${COMPOSE[@]}" restart nginx
}

obtain_certificate() {
    echo "==> Requesting Let's Encrypt certificate"

    "${COMPOSE[@]}" run --rm certbot certonly \
        --webroot \
        --webroot-path /var/www/certbot \
        --email "${LETSENCRYPT_EMAIL}" \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        -d "${DOMAIN}"

    echo "==> Let's Encrypt certificate obtained"
}

renew_certificate() {
    echo "==> Checking Let's Encrypt certificate renewal"

    "${COMPOSE[@]}" run --rm certbot renew \
        --webroot \
        --webroot-path /var/www/certbot

    echo "==> Reloading Nginx"

    "${COMPOSE[@]}" exec -T nginx nginx -s reload
}

setup_https() {
    prepare_certbot

    if certificate_exists; then
        echo "==> Let's Encrypt certificate already exists"

        renew_certificate

        return
    fi

    if [[ -z "${LETSENCRYPT_EMAIL}" ]]; then
        echo "ERROR: LETSENCRYPT_EMAIL is required."
        echo
        echo "Example:"
        echo
        echo "  LETSENCRYPT_EMAIL=admin@turandevelop.com ./run.vps.sh"
        echo
        exit 1
    fi

    write_bootstrap_config
    start_bootstrap_nginx

    cleanup_bootstrap() {
        if [[ -f nginx/vps.final.conf ]]; then
            echo "==> Restoring HTTPS configuration after failure"

            cp nginx/vps.final.conf nginx/vps.conf
            rm -f nginx/vps.final.conf
            rm -f nginx/vps.bootstrap.conf

            "${COMPOSE[@]}" restart nginx >/dev/null 2>&1 || true
        fi
    }

    trap cleanup_bootstrap ERR

    echo "==> Creating ACME test challenge"

    local challenge_file
    challenge_file="${CERTBOT_DIR}/www/.well-known/acme-challenge/valizu-test"

    echo "valizu-acme-test" > "${challenge_file}"

    echo "==> Verifying public ACME endpoint"

    local acme_url
    acme_url="http://${DOMAIN}/.well-known/acme-challenge/valizu-test"

    for i in {1..30}; do
        if [[ "$(curl -fsS "${acme_url}" 2>/dev/null || true)" == "valizu-acme-test" ]]; then
            echo "==> ACME HTTP endpoint is ready"
            break
        fi

        if [[ "$i" -eq 30 ]]; then
            echo "ERROR: ACME HTTP endpoint did not become ready."
            return 1
        fi

        sleep 2
    done

    rm -f "${challenge_file}"

    obtain_certificate

    restore_https_nginx

    trap - ERR

    echo "==> HTTPS setup completed"
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

    echo "==> Building and starting Valizu API"

    "${COMPOSE[@]}" up -d --build api postgres

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

    echo "==> Configuring HTTPS"

    setup_https
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
echo "https://${DOMAIN}"

echo
echo "Swagger:"
echo "https://${DOMAIN}/docs/"
