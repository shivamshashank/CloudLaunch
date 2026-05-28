interface BootstrapOptions {
  deploymentId: string;
  ingestUrl: string;
  ingestToken: string;
  enableMonitoring: boolean;
}

function shellEscape(value: string) {
  return value.replace(/'/g, "'\"'\"'");
}

export function buildObservabilityBootstrapScript({
  deploymentId,
  ingestUrl,
  ingestToken,
  enableMonitoring,
}: BootstrapOptions) {
  const monitoringFlag = enableMonitoring ? "true" : "false";

  return `#!/usr/bin/env bash
set -euo pipefail

DEPLOYMENT_ID='${shellEscape(deploymentId)}'
INGEST_URL='${shellEscape(ingestUrl)}'
INGEST_TOKEN='${shellEscape(ingestToken)}'
ENABLE_MONITORING='${monitoringFlag}'

send_log() {
  local level="$1"
  local message="$2"
  curl -fsS -X POST "$INGEST_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $INGEST_TOKEN" \
    --data "{\"deploymentId\":\"$DEPLOYMENT_ID\",\"level\":\"$level\",\"message\":\"$message\"}" >/dev/null || true
}

run_step() {
  local message="$1"
  shift
  send_log INFO "$message"
  "$@" 2>&1 | while IFS= read -r line; do
    send_log INFO "$line"
  done
}

send_log INFO "EC2 bootstrap started on $(hostname)."
send_log INFO "Installing Docker and compose plugin."

export DEBIAN_FRONTEND=noninteractive
run_step "Refreshing apt package index." apt-get update -y
run_step "Installing Docker dependencies." apt-get install -y ca-certificates curl gnupg lsb-release
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
run_step "Installing Docker engine." apt-get update -y
run_step "Installing Docker packages." apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

mkdir -p /opt/cloudlaunch/prometheus /opt/cloudlaunch/promtail /opt/cloudlaunch/loki
cat >/opt/cloudlaunch/prometheus/prometheus.yml <<'PROMETHEUS'
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: node
    static_configs:
      - targets: ["node-exporter:9100"]
  - job_name: prometheus
    static_configs:
      - targets: ["prometheus:9090"]
PROMETHEUS

cat >/opt/cloudlaunch/loki/loki.yml <<'LOKI'
auth_enabled: false
server:
  http_listen_port: 3100
common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory
schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h
LOKI

cat >/opt/cloudlaunch/promtail/promtail.yml <<'PROMTAIL'
server:
  http_listen_port: 9080
positions:
  filename: /tmp/positions.yaml
clients:
  - url: http://loki:3100/loki/api/v1/push
scrape_configs:
  - job_name: system
    static_configs:
      - targets: [localhost]
        labels:
          job: varlogs
          __path__: /var/log/*.log
PROMTAIL

cat >/opt/cloudlaunch/docker-compose.yml <<'COMPOSE'
services:
  prometheus:
    image: prom/prometheus:v2.55.1
    command: ["--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.retention.time=15d"]
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    restart: unless-stopped
  grafana:
    image: grafana/grafana:11.3.0
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: cloudlaunch
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - grafana-data:/var/lib/grafana
    restart: unless-stopped
  loki:
    image: grafana/loki:3.2.1
    command: ["-config.file=/etc/loki/loki.yml"]
    ports:
      - "3100:3100"
    volumes:
      - ./loki/loki.yml:/etc/loki/loki.yml:ro
      - loki-data:/loki
    restart: unless-stopped
  promtail:
    image: grafana/promtail:3.2.1
    command: ["-config.file=/etc/promtail/promtail.yml"]
    volumes:
      - /var/log:/var/log:ro
      - ./promtail/promtail.yml:/etc/promtail/promtail.yml:ro
    restart: unless-stopped
  node-exporter:
    image: prom/node-exporter:v1.8.2
    command:
      - "--path.rootfs=/host"
    pid: host
    ports:
      - "9100:9100"
    volumes:
      - /:/host:ro,rslave
    restart: unless-stopped
volumes:
  prometheus-data:
  grafana-data:
  loki-data:
COMPOSE

if [ "$ENABLE_MONITORING" = "true" ]; then
  run_step "Starting Prometheus, Grafana, Loki, Promtail, and node-exporter." docker compose -f /opt/cloudlaunch/docker-compose.yml up -d
  send_log SUCCESS "Observability stack is running. Grafana: http://$(curl -fsS http://169.254.169.254/latest/meta-data/public-ipv4 || hostname -I | awk '{print $1}'):3000"
  send_log SUCCESS "Prometheus is running on port 9090 and Loki is running on port 3100."
else
  send_log WARN "Monitoring was disabled for this deployment; EC2 bootstrap completed without starting the observability stack."
fi

send_log SUCCESS "EC2 bootstrap finished successfully."
`;
}
