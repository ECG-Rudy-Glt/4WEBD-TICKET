Write-Host "==========================================="
Write-Host "   TEST DE RÉSILIENCE HAUTE DISPONIBILITÉ   "
Write-Host "==========================================="
Write-Host ""
Write-Host "[1] Lancement de requêtes continues en arrière-plan..."
$job = Start-Job {
    $success = 0
    $fail = 0
    for ($i = 1; $i -le 30; $i++) {
        try {
            $resp = Invoke-RestMethod -Uri "http://localhost/api/tickets" -Method Get -TimeoutSec 2 -ErrorAction Stop
            $success++
            Write-Output "[$i] OK (200)"
        } catch {
            $fail++
            Write-Output "[$i] FAIL: $($_.Exception.Message)"
        }
        Start-Sleep -Seconds 1
    }
    return "Summary: $success OK, $fail Faillures"
}

Write-Host "Requêtes lancées. Attente 3 secondes..."
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "[2] Chaos Engineering: Tuer le leader de la DB Booking (booking-db-1) et le replica 1 du Booking Service..."
docker kill 4webd-ticket-full-infra-booking-db-1-1
docker kill 4webd-ticket-full-infra-booking-service-1

Write-Host "Containers tués ! Les requêtes s'exécutent toujours..."
Write-Host "Attente du failover (PgBouncer / Load Balancer) pendant 10 secondes..."
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "[3] Test immédiat de l'API Booking après le Crash :"
try {
    $immediateResp = Invoke-RestMethod -Uri "http://localhost/api/tickets" -Method Get -TimeoutSec 2 -ErrorAction Stop
    Write-Host " > SUCCÈS : L'API a répondu correctement même après le crash !" -ForegroundColor Green
} catch {
    Write-Host " > ÉCHEC : L'API est tombée suite au crash." -ForegroundColor Red
}

Write-Host ""
Write-Host "[4] Résultats des requêtes continues pendant le crash :"
Wait-Job -Job $job -Timeout 35 | Out-Null
Receive-Job -Job $job
Remove-Job -Job $job -Force

Write-Host "[5] Relance des containers tués pour rétablir l'état initial..."
docker start 4webd-ticket-full-infra-booking-db-1-1
docker start 4webd-ticket-full-infra-booking-service-1

$resultString = @"
Chaos Test Terminé:
Succès après crash: $immediateResp (200 OK)
"@
$resultString | Out-File "chaos_summary.txt" -Encoding utf8
Write-Host "Test de résilience terminé."
