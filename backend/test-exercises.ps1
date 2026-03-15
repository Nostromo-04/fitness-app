# test-exercises.ps1
$ErrorActionPreference = "Stop"

Write-Host "=== ТЕСТИРОВАНИЕ API УПРАЖНЕНИЙ ===" -ForegroundColor Green

# Функция для выполнения запросов
function Invoke-ExerciseAPI {
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
        Write-Host "✅ Статус: $($response.StatusCode)" -ForegroundColor Green
        
        $content = $response.Content | ConvertFrom-Json
        Write-Host "📄 Ответ:" -ForegroundColor Magenta
        return $content
    }
    catch {
        Write-Host "❌ Ошибка:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $errorBody = $reader.ReadToEnd()
            Write-Host "📄 Тело ошибки:" -ForegroundColor Red
            Write-Host $errorBody -ForegroundColor Red
        }
        return $null
    }
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "1. СОЗДАНИЕ УПРАЖНЕНИЙ" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$exercises = @(
    @{
        name = "Жим штанги лежа"
        muscle_group = "Грудь"
        image_url = "https://example.com/bench.jpg"
        video_url = "https://youtube.com/watch?v=123"
        created_by_coach_id = 1
    },
    @{
        name = "Приседания со штангой"
        muscle_group = "Ноги"
        image_url = "https://example.com/squat.jpg"
        video_url = "https://youtube.com/watch?v=456"
        created_by_coach_id = 1
    },
    @{
        name = "Тяга верхнего блока"
        muscle_group = "Спина"
        image_url = "https://example.com/lat.jpg"
        video_url = "https://youtube.com/watch?v=789"
        created_by_coach_id = 1
    }
)

foreach ($ex in $exercises) {
    $result = Invoke-ExerciseAPI -Method POST -Url "http://localhost:5000/api/exercises" -Body $ex
    if ($result) {
        $result | ConvertTo-Json -Depth 5
    }
    Start-Sleep -Seconds 1
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "2. ПОЛУЧЕНИЕ ВСЕХ УПРАЖНЕНИЙ" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$allExercises = Invoke-ExerciseAPI -Method GET -Url "http://localhost:5000/api/exercises"
if ($allExercises) {
    $allExercises | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "3. ФИЛЬТР ПО ГРУППЕ МЫШЦ (Грудь)" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$filtered = Invoke-ExerciseAPI -Method GET -Url "http://localhost:5000/api/exercises?muscleGroup=Грудь"
if ($filtered) {
    $filtered | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "4. ГРУППЫ МЫШЦ" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$muscleGroups = Invoke-ExerciseAPI -Method GET -Url "http://localhost:5000/api/exercises/muscle-groups"
if ($muscleGroups) {
    $muscleGroups | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "5. ПОИСК УПРАЖНЕНИЙ (жим)" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$search = Invoke-ExerciseAPI -Method GET -Url "http://localhost:5000/api/exercises/search?q=жим"
if ($search) {
    $search | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "6. УПРАЖНЕНИЯ ТРЕНЕРА (id=1)" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$coachExercises = Invoke-ExerciseAPI -Method GET -Url "http://localhost:5000/api/exercises/coach/1"
if ($coachExercises) {
    $coachExercises | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "7. КОНКРЕТНОЕ УПРАЖНЕНИЕ (id=1)" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$singleExercise = Invoke-ExerciseAPI -Method GET -Url "http://localhost:5000/api/exercises/1"
if ($singleExercise) {
    $singleExercise | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "8. ОБНОВЛЕНИЕ УПРАЖНЕНИЯ" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$updateData = @{
    name = "Жим штанги лежа на наклонной скамье"
}

$updated = Invoke-ExerciseAPI -Method PUT -Url "http://localhost:5000/api/exercises/1" -Body $updateData
if ($updated) {
    $updated | ConvertTo-Json -Depth 5
}

Write-Host "`n${'='*50}" -ForegroundColor Blue
Write-Host "9. ПРОВЕРКА ИЗМЕНЕНИЙ" -ForegroundColor Blue
Write-Host "${'='*50}" -ForegroundColor Blue

$check = Invoke-ExerciseAPI -Method GET -Url "http://localhost:5000/api/exercises/1"
if ($check) {
    $check | ConvertTo-Json -Depth 5
}

Write-Host "`n=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===" -ForegroundColor Green