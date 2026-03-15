# test-logs.ps1
$ErrorActionPreference = "Stop"

Write-Host "=== TESTING WORKOUT LOGGING API ===" -ForegroundColor Green

function Invoke-LogAPI {
    param(
        [string]$Method,
        [string]$Url,
        [object]$Body
    )
    
    Write-Host "`n➡️  $Method $Url" -ForegroundColor Yellow
    
    $params = @{
        Uri = $Url
        Method = $Method
        Headers = @{"Content-Type"="application/json"}
    }
    
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
        Write-Host "📦 Body: $($params.Body)" -ForegroundColor Cyan
    }
    
    try {
        $response = Invoke-WebRequest @params
        Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
        
        $content = $response.Content | ConvertFrom-Json
        return $content
    }
    catch {
        Write-Host "❌ Error:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $null
    }
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "1. START WORKOUT (athlete_id=2, plan_id=1, day_id=1)" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$startBody = @{
    athlete_id = 2
    plan_id = 1
    day_id = 1
}

$session = Invoke-LogAPI -Method POST -Url "http://localhost:5000/api/logs/sessions/start" -Body $startBody
if ($session) {
    $session | ConvertTo-Json -Depth 5
    $sessionId = $session.data.id
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "2. CHECK ACTIVE SESSION" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$active = Invoke-LogAPI -Method GET -Url "http://localhost:5000/api/logs/sessions/active/2"
if ($active) {
    $active | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "3. LOG SET 1 (exercise_id=1, set_number=1, reps=10, weight=50)" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$set1Body = @{
    exercise_id = 1
    set_number = 1
    reps_done = 10
    weight_done = 50
    is_completed = $true
}

$set1 = Invoke-LogAPI -Method POST -Url "http://localhost:5000/api/logs/sessions/$sessionId/sets" -Body $set1Body

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "4. LOG SET 2 (exercise_id=1, set_number=2, reps=8, weight=55)" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$set2Body = @{
    exercise_id = 1
    set_number = 2
    reps_done = 8
    weight_done = 55
    is_completed = $true
}

$set2 = Invoke-LogAPI -Method POST -Url "http://localhost:5000/api/logs/sessions/$sessionId/sets" -Body $set2Body

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "5. LOG SET 3 (exercise_id=4, set_number=1, reps=12, weight=15)" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$set3Body = @{
    exercise_id = 4
    set_number = 1
    reps_done = 12
    weight_done = 15
    is_completed = $true
}

$set3 = Invoke-LogAPI -Method POST -Url "http://localhost:5000/api/logs/sessions/$sessionId/sets" -Body $set3Body

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "6. GET ALL SETS FOR SESSION" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$allSets = Invoke-LogAPI -Method GET -Url "http://localhost:5000/api/logs/sessions/$sessionId/sets"
if ($allSets) {
    $allSets | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "7. COMPLETE WORKOUT WITH 👍 FEEDBACK" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$completeBody = @{
    feedback_emoji = "👍"
}

$completed = Invoke-LogAPI -Method PUT -Url "http://localhost:5000/api/logs/sessions/$sessionId/complete" -Body $completeBody

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "8. GET WORKOUT DETAILS" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$details = Invoke-LogAPI -Method GET -Url "http://localhost:5000/api/logs/sessions/$sessionId"
if ($details) {
    $details | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "9. GET WORKOUT CALENDAR FOR MARCH 2026" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$calendar = Invoke-LogAPI -Method GET -Url "http://localhost:5000/api/logs/calendar/2?year=2026&month=3"
if ($calendar) {
    $calendar | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "10. GET WORKOUT BY DATE (TODAY)" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$today = Get-Date -Format "yyyy-MM-dd"
$workoutByDate = Invoke-LogAPI -Method GET -Url "http://localhost:5000/api/logs/calendar/2/date/$today"
if ($workoutByDate) {
    $workoutByDate | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "11. GET EXERCISE PROGRESS (exercise_id=1)" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$progress = Invoke-LogAPI -Method GET -Url "http://localhost:5000/api/logs/progress/2/exercise/1?limit=5"
if ($progress) {
    $progress | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "12. GET ATHLETE SUMMARY" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$summary = Invoke-LogAPI -Method GET -Url "http://localhost:5000/api/logs/summary/2"
if ($summary) {
    $summary | ConvertTo-Json -Depth 5
}

Write-Host "`n=== TEST COMPLETED ===" -ForegroundColor Green