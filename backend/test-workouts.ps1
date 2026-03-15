# test-workouts.ps1
$ErrorActionPreference = "Stop"

Write-Host "=== ТЕСТИРОВАНИЕ API ПЛАНОВ ТРЕНИРОВОК ===" -ForegroundColor Green

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
Write-Host "1. СОЗДАНИЕ ПЛАНА ТРЕНИРОВКИ" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$planBody = @{
    name = "Месяц 1 - Начальный уровень"
    coach_id = 1
}

$plan = Invoke-WorkoutAPI -Method POST -Url "http://localhost:5000/api/workouts/plans" -Body $planBody
if ($plan) {
    $plan | ConvertTo-Json -Depth 5
    $planId = $plan.data.id
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "2. ПОЛУЧЕНИЕ ВСЕХ ПЛАНОВ ТРЕНЕРА" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$coachPlans = Invoke-WorkoutAPI -Method GET -Url "http://localhost:5000/api/workouts/plans/coach/1"
if ($coachPlans) {
    $coachPlans | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "3. ДОБАВЛЕНИЕ ДНЕЙ В ПЛАН" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

# День 1
$day1Body = @{ day_number = 1 }
$day1 = Invoke-WorkoutAPI -Method POST -Url "http://localhost:5000/api/workouts/plans/$planId/days" -Body $day1Body

# День 2
$day2Body = @{ day_number = 2 }
$day2 = Invoke-WorkoutAPI -Method POST -Url "http://localhost:5000/api/workouts/plans/$planId/days" -Body $day2Body

# День 3
$day3Body = @{ day_number = 3 }
$day3 = Invoke-WorkoutAPI -Method POST -Url "http://localhost:5000/api/workouts/plans/$planId/days" -Body $day3Body

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "4. ПОЛУЧЕНИЕ ВСЕХ ДНЕЙ ПЛАНА" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$planDays = Invoke-WorkoutAPI -Method GET -Url "http://localhost:5000/api/workouts/plans/$planId/days"
if ($planDays) {
    $planDays | ConvertTo-Json -Depth 5
    $day1Id = $planDays.data[0].id
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "5. ДОБАВЛЕНИЕ УПРАЖНЕНИЙ В ДЕНЬ 1" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

# Упражнение 1: Жим лежа
$ex1Body = @{
    exercise_id = 1
    sets_count = 4
    default_reps = 10
    default_weight = 50
    order_index = 1
}
$ex1 = Invoke-WorkoutAPI -Method POST -Url "http://localhost:5000/api/workouts/days/$day1Id/exercises" -Body $ex1Body

# Упражнение 2: Разводка гантелей
$ex2Body = @{
    exercise_id = 4
    sets_count = 3
    default_reps = 12
    default_weight = 15
    order_index = 2
}
$ex2 = Invoke-WorkoutAPI -Method POST -Url "http://localhost:5000/api/workouts/days/$day1Id/exercises" -Body $ex2Body

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "6. ПОЛУЧЕНИЕ УПРАЖНЕНИЙ ДНЯ 1" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$dayExercises = Invoke-WorkoutAPI -Method GET -Url "http://localhost:5000/api/workouts/days/$day1Id/exercises"
if ($dayExercises) {
    $dayExercises | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "7. ПОЛУЧЕНИЕ ПЛАНА С ПОЛНОЙ СТРУКТУРОЙ" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$fullPlan = Invoke-WorkoutAPI -Method GET -Url "http://localhost:5000/api/workouts/plans/$planId"
if ($fullPlan) {
    $fullPlan | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "8. НАЗНАЧЕНИЕ ПЛАНА СПОРТСМЕНУ" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$assign = Invoke-WorkoutAPI -Method POST -Url "http://localhost:5000/api/workouts/plans/$planId/assign/2"

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "9. ПОЛУЧЕНИЕ СПОРТСМЕНОВ ПЛАНА" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$planAthletes = Invoke-WorkoutAPI -Method GET -Url "http://localhost:5000/api/workouts/plans/$planId/athletes"
if ($planAthletes) {
    $planAthletes | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "10. ОБНОВЛЕНИЕ УПРАЖНЕНИЯ В ДНЕ" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$updateExBody = @{
    default_reps = 15
    default_weight = 55
}
$updatedEx = Invoke-WorkoutAPI -Method PUT -Url "http://localhost:5000/api/workouts/day-exercises/1" -Body $updateExBody

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "11. ПРОВЕРКА ОБНОВЛЕНИЯ" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$checkExercises = Invoke-WorkoutAPI -Method GET -Url "http://localhost:5000/api/workouts/days/$day1Id/exercises"
if ($checkExercises) {
    $checkExercises | ConvertTo-Json -Depth 5
}

Write-Host "`n=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===" -ForegroundColor Green