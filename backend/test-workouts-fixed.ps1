# test-workouts-fixed.ps1
$ErrorActionPreference = "Stop"

Write-Host "=== WORKOUT PLANS API TEST ===" -ForegroundColor Green

function Invoke-WorkoutAPI {
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
Write-Host "1. CREATE WORKOUT PLAN" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$planBody = @{
    name = "Month 1 - Beginner Level"
    coach_id = 1
}

$plan = Invoke-WorkoutAPI -Method POST -Url "http://localhost:5000/api/workouts/plans" -Body $planBody
if ($plan) {
    $plan | ConvertTo-Json -Depth 5
    $planId = $plan.data.id
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "2. GET COACH PLANS" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$coachPlans = Invoke-WorkoutAPI -Method GET -Url "http://localhost:5000/api/workouts/plans/coach/1"
if ($coachPlans) {
    $coachPlans | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "3. ADD DAYS TO PLAN" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

# Day 1
$day1Body = @{ day_number = 1 }
$day1 = Invoke-WorkoutAPI -Method POST -Url "http://localhost:5000/api/workouts/plans/$planId/days" -Body $day1Body

# Day 2
$day2Body = @{ day_number = 2 }
$day2 = Invoke-WorkoutAPI -Method POST -Url "http://localhost:5000/api/workouts/plans/$planId/days" -Body $day2Body

# Day 3
$day3Body = @{ day_number = 3 }
$day3 = Invoke-WorkoutAPI -Method POST -Url "http://localhost:5000/api/workouts/plans/$planId/days" -Body $day3Body

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "4. GET PLAN DAYS" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$planDays = Invoke-WorkoutAPI -Method GET -Url "http://localhost:5000/api/workouts/plans/$planId/days"
if ($planDays) {
    $planDays | ConvertTo-Json -Depth 5
    if ($planDays.data.Count -gt 0) {
        $day1Id = $planDays.data[0].id
    }
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "5. ADD EXERCISES TO DAY 1" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

# Exercise 1: Bench Press
$ex1Body = @{
    exercise_id = 1
    sets_count = 4
    default_reps = 10
    default_weight = 50
    order_index = 1
}
$ex1 = Invoke-WorkoutAPI -Method POST -Url "http://localhost:5000/api/workouts/days/$day1Id/exercises" -Body $ex1Body

# Exercise 2: Dumbbell Flyes
$ex2Body = @{
    exercise_id = 4
    sets_count = 3
    default_reps = 12
    default_weight = 15
    order_index = 2
}
$ex2 = Invoke-WorkoutAPI -Method POST -Url "http://localhost:5000/api/workouts/days/$day1Id/exercises" -Body $ex2Body

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "6. GET DAY EXERCISES" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$dayExercises = Invoke-WorkoutAPI -Method GET -Url "http://localhost:5000/api/workouts/days/$day1Id/exercises"
if ($dayExercises) {
    $dayExercises | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "7. GET FULL PLAN DETAILS" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$fullPlan = Invoke-WorkoutAPI -Method GET -Url "http://localhost:5000/api/workouts/plans/$planId"
if ($fullPlan) {
    $fullPlan | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "8. ASSIGN PLAN TO ATHLETE" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$assign = Invoke-WorkoutAPI -Method POST -Url "http://localhost:5000/api/workouts/plans/$planId/assign/2"

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "9. GET PLAN ATHLETES" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$planAthletes = Invoke-WorkoutAPI -Method GET -Url "http://localhost:5000/api/workouts/plans/$planId/athletes"
if ($planAthletes) {
    $planAthletes | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "10. UPDATE DAY EXERCISE" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$updateExBody = @{
    default_reps = 15
    default_weight = 55
}
$updatedEx = Invoke-WorkoutAPI -Method PUT -Url "http://localhost:5000/api/workouts/day-exercises/1" -Body $updateExBody

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "11. VERIFY UPDATE" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$checkExercises = Invoke-WorkoutAPI -Method GET -Url "http://localhost:5000/api/workouts/days/$day1Id/exercises"
if ($checkExercises) {
    $checkExercises | ConvertTo-Json -Depth 5
}

Write-Host "`n=== TEST COMPLETED ===" -ForegroundColor Green