# test-logs-simple.ps1
$ErrorActionPreference = "Stop"

Write-Host "=== TESTING WORKOUT LOGGING API ===" -ForegroundColor Green

function Invoke-LogAPI {
    param($Method, $Url, $Body)
    
    Write-Host "`n➡️  $Method $Url" -ForegroundColor Yellow
    
    $params = @{
        Uri = $Url
        Method = $Method
        Headers = @{"Content-Type"="application/json"}
    }
    
    if ($Body) {
        $jsonBody = $Body | ConvertTo-Json -Compress
        Write-Host "📦 Body: $jsonBody" -ForegroundColor Cyan
        $params.Body = $jsonBody
    }
    
    try {
        $response = Invoke-WebRequest @params
        Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
        return $response.Content
    }
    catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        return $null
    }
}

Write-Host "`n=========================================" -ForegroundColor Blue
Write-Host "1. START WORKOUT" -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue

$startBody = @{
    athlete_id = 2
    plan_id = 1
    day_id = 1
}

$response = Invoke-LogAPI -Method POST -Url "http://localhost:5000/api/logs/sessions/start" -Body $startBody
if ($response) {
    Write-Host "Response: $response" -ForegroundColor Magenta
    # Пытаемся извлечь sessionId
    if ($response -match '"id":\s*(\d+)') {
        $sessionId = $matches[1]
        Write-Host "Session ID: $sessionId" -ForegroundColor Green
    }
}

Write-Host "`n=========================================" -ForegroundColor Blue
Write-Host "2. LOG SETS" -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue

if ($sessionId) {
    # Set 1
    $set1 = @{
        exercise_id = 1
        set_number = 1
        reps_done = 10
        weight_done = 50
        is_completed = $true
    }
    Invoke-LogAPI -Method POST -Url "http://localhost:5000/api/logs/sessions/$sessionId/sets" -Body $set1
    
    # Set 2
    $set2 = @{
        exercise_id = 1
        set_number = 2
        reps_done = 8
        weight_done = 55
        is_completed = $true
    }
    Invoke-LogAPI -Method POST -Url "http://localhost:5000/api/logs/sessions/$sessionId/sets" -Body $set2
    
    # Set 3
    $set3 = @{
        exercise_id = 4
        set_number = 1
        reps_done = 12
        weight_done = 15
        is_completed = $true
    }
    Invoke-LogAPI -Method POST -Url "http://localhost:5000/api/logs/sessions/$sessionId/sets" -Body $set3
}

Write-Host "`n=========================================" -ForegroundColor Blue
Write-Host "3. GET ALL SETS" -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue

if ($sessionId) {
    Invoke-LogAPI -Method GET -Url "http://localhost:5000/api/logs/sessions/$sessionId/sets"
}

Write-Host "`n=========================================" -ForegroundColor Blue
Write-Host "4. COMPLETE WORKOUT" -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue

if ($sessionId) {
    $completeBody = @{
        feedback_emoji = "👍"
    }
    Invoke-LogAPI -Method PUT -Url "http://localhost:5000/api/logs/sessions/$sessionId/complete" -Body $completeBody
}

Write-Host "`n=========================================" -ForegroundColor Blue
Write-Host "5. GET WORKOUT DETAILS" -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue

if ($sessionId) {
    Invoke-LogAPI -Method GET -Url "http://localhost:5000/api/logs/sessions/$sessionId"
}

Write-Host "`n=========================================" -ForegroundColor Blue
Write-Host "6. GET CALENDAR" -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue

$today = Get-Date -Format "yyyy-MM-dd"
$calendar = Invoke-LogAPI -Method GET -Url "http://localhost:5000/api/logs/calendar/2?year=2026&month=3"

Write-Host "`n=========================================" -ForegroundColor Blue
Write-Host "7. GET EXERCISE PROGRESS" -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue

$progress = Invoke-LogAPI -Method GET -Url "http://localhost:5000/api/logs/progress/2/exercise/1"

Write-Host "`n=========================================" -ForegroundColor Blue
Write-Host "8. GET ATHLETE SUMMARY" -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue

$summary = Invoke-LogAPI -Method GET -Url "http://localhost:5000/api/logs/summary/2"

Write-Host "`n=== TEST COMPLETED ===" -ForegroundColor Green