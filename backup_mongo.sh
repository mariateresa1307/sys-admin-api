# ejecutar el script dentro del sistema operativo que tenga instalado mongodump
# para ejecutarlo: 
# 1. darle permisos : chmod +x backup_mongo.sh
# 2. ejecutarlo: ./backup_mongo.sh

# old crontab execution
# 0 5,16 * * * docker exec mongodb mongodump --username admin --password admin --authenticationDatabase admin --archive > /var/backups/mongodb/backup_actual.archive   


# current date 
backup_date=$(date +%Y-%m-%d_%H-%M-%S)

# Crear respaldo 
mongodump --username admin --password admin --authenticationDatabase admin --archive=/home/backup/backup_${backup_date}.archive 

# Mantener solo los últimos 4 respaldos y borrar el resto
ls -t /home/backup/backup_*.archive 2>/dev/null | tail -n +5 | xargs -r rm -f