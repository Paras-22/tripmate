# Here I start a MongoDB replica set with 3 members on one computer.
# Run it from the tripmate folder with: powershell -ExecutionPolicy Bypass -File scripts/start-replica-set.ps1
# Mongod must be installed and on the PATH (or change $mongod below).

$mongod = (Get-Command mongod -ErrorAction SilentlyContinue).Source
if (-not $mongod) { $mongod = Resolve-Path 'C:\Program Files\MongoDB\Server\*\bin\mongod.exe' | Select-Object -Last 1 -ExpandProperty Path }

# Here I give each member its own port and its own data folder
foreach ($port in 27031, 27032, 27033) {
    $folder = "db-data/$port"
    New-Item -ItemType Directory -Force $folder | Out-Null
    Start-Process $mongod -WindowStyle Hidden -ArgumentList '--replSet', 'rs0', '--port', $port, '--dbpath', $folder, '--bind_ip', '127.0.0.1'
}

Start-Sleep -Seconds 5

# Here I tell the 3 members to work together. On later runs this just says they are already set up.
$setup = "try { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'localhost:27031' }, { _id: 1, host: 'localhost:27032' }, { _id: 2, host: 'localhost:27033' }] }) } catch (e) { print('Replica set is already set up') }"
mongosh --quiet --port 27031 --eval $setup

Write-Host 'Replica set rs0 is running on ports 27031, 27032 and 27033.'
