#!/bin/bash
# =============================================================================
# Hostix — DigitalOcean MySQL Migration Script
# Run this on your LOCAL MACHINE (Windows: use Git Bash or WSL)
# =============================================================================
# USAGE:
#   bash migrate_to_droplet.sh
#
# PREREQUISITES:
#   - mysql client installed locally (brew install mysql-client or apt install mysql-client)
#   - SSH key access to the DigitalOcean droplet
#   - Aiven credentials in your backend/.env
# =============================================================================

set -e

# ── CONFIG — fill these in ───────────────────────────────────────────────────
DROPLET_IP="143.244.131.69"      # Your DigitalOcean droplet IP
DROPLET_USER="root"              # SSH user

# Aiven (source)
AIVEN_HOST="mysql-1a300d6c-veeradurgarao840-0853.c.aivencloud.com"
AIVEN_PORT="11120"
AIVEN_USER="avnadmin"
AIVEN_PASS="AVNS_XKhIofBUB4pR5LOtnEg"
AIVEN_DB="hostel_management"

# Local MySQL to create on droplet
LOCAL_DB="hostel_management"
LOCAL_USER="hostix_app"
LOCAL_PASS="$(openssl rand -base64 24)"  # auto-generates a strong password

echo "=== [1/6] Backing up Aiven DB to backup.sql ==="
mysqldump \
  -h "$AIVEN_HOST" -P "$AIVEN_PORT" \
  -u "$AIVEN_USER" -p"$AIVEN_PASS" \
  --ssl-mode=REQUIRED \
  --single-transaction \
  --set-gtid-purged=OFF \
  "$AIVEN_DB" > backup_$(date +%Y%m%d_%H%M%S).sql

echo "✅ Backup complete: backup_$(date +%Y%m%d_%H%M%S).sql"

echo ""
echo "=== [2/6] Installing MySQL on DigitalOcean droplet ==="
ssh "$DROPLET_USER@$DROPLET_IP" <<ENDSSH
  apt-get update -qq
  apt-get install -y mysql-server
  systemctl enable mysql
  systemctl start mysql
  echo "✅ MySQL installed"
ENDSSH

echo ""
echo "=== [3/6] Creating database and least-privilege user on droplet ==="
ssh "$DROPLET_USER@$DROPLET_IP" <<ENDSSH
  mysql -u root <<MYSQL
    CREATE DATABASE IF NOT EXISTS $LOCAL_DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER IF NOT EXISTS '$LOCAL_USER'@'localhost' IDENTIFIED BY '$LOCAL_PASS';
    GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, REFERENCES, LOCK TABLES
      ON $LOCAL_DB.* TO '$LOCAL_USER'@'localhost';
    FLUSH PRIVILEGES;
    SHOW GRANTS FOR '$LOCAL_USER'@'localhost';
MYSQL
  echo "✅ Database $LOCAL_DB and user $LOCAL_USER created"
ENDSSH

echo ""
echo "=== [4/6] Copying backup to droplet and importing ==="
scp backup_*.sql "$DROPLET_USER@$DROPLET_IP:/tmp/hostix_backup.sql"
ssh "$DROPLET_USER@$DROPLET_IP" <<ENDSSH
  mysql -u root "$LOCAL_DB" < /tmp/hostix_backup.sql
  echo "✅ Import complete"
  rm /tmp/hostix_backup.sql
ENDSSH

echo ""
echo "=== [5/6] Setting up daily automated backup cron on droplet ==="
ssh "$DROPLET_USER@$DROPLET_IP" <<ENDSSH
  mkdir -p /root/db_backups
  # Store MySQL credentials securely
  cat > /root/.my_backup.cnf <<CNF
[mysqldump]
user=$LOCAL_USER
password=$LOCAL_PASS
CNF
  chmod 600 /root/.my_backup.cnf

  # Daily dump at 3:00 AM, keep 14 days
  (crontab -l 2>/dev/null; echo "0 3 * * * mysqldump --defaults-file=/root/.my_backup.cnf $LOCAL_DB > /root/db_backups/hostix_\$(date +\%Y\%m\%d).sql && find /root/db_backups -name '*.sql' -mtime +14 -delete") | crontab -
  echo "✅ Daily backup cron installed"
  crontab -l
ENDSSH

echo ""
echo "=================================================================="
echo "✅ MIGRATION COMPLETE"
echo ""
echo "📋 Your new .env settings for the droplet:"
echo ""
echo "DB_HOST=127.0.0.1"
echo "DB_PORT=3306"
echo "DB_USER=$LOCAL_USER"
echo "DB_PASSWORD=$LOCAL_PASS"
echo "DB_NAME=$LOCAL_DB"
echo "DB_SSL=false"
echo "DB_POOL_MIN=2"
echo "DB_POOL_MAX=10"
echo ""
echo "⚠️  UPDATE your backend .env on the droplet with the above settings!"
echo "   ssh $DROPLET_USER@$DROPLET_IP"
echo "   nano /path/to/backend/.env"
echo ""
echo "=== [6/6] Run this to verify local query speed ==="
echo "   ssh $DROPLET_USER@$DROPLET_IP"
echo '   mysql -u'"$LOCAL_USER"' -p'"$LOCAL_PASS"' '"$LOCAL_DB"' -e "SELECT COUNT(*) FROM students; SELECT COUNT(*) FROM monthly_fees;"'
echo "=================================================================="
