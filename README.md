# Fitness App — Design Package

Тёмная тема (#0a0a0c) + лаймовый акцент (#a3e635).

## Что внутри

```
frontend/src/
├── index.css                          ← CSS-переменные + глобальные стили
├── pages/
│   ├── AthleteDashboard.css
│   ├── AthleteWorkoutPage.css
│   ├── AthleteProgressPage.css
│   ├── AthleteCalendarPage.css
│   ├── AthletePlanPage.css
│   ├── AthleteCompletePage.css
│   ├── CoachDashboard.css
│   ├── CoachAthletePlansPage.css
│   ├── CoachAthleteCalendarPage.css
│   ├── CoachAthleteProgressPage.css
│   ├── CreatePlanPage.css
│   ├── ExerciseLibrary.css
│   ├── HomePage.css
│   ├── LoginPage.css
│   └── UserSelectionPage.css          ← обновлён (добавлен список пользователей)
└── components/
    ├── ExerciseCard.css
    ├── ExerciseModal.css
    ├── ExerciseSelector.css
    └── PlanExerciseItem.css

pages/ (ОБНОВЛЁННЫЙ TSX)
└── UserSelectionPage.tsx              ← ID-бейдж вместо инициалов
```

## Как перенести

1. Скопируй **все файлы из `frontend/src/pages/*.css`** в `frontend/src/pages/` своего проекта.
2. Скопируй **все файлы из `frontend/src/components/*.css`** в `frontend/src/components/`.
3. Замени **`frontend/src/index.css`** (содержит все CSS-переменные темы).
4. Замени **`frontend/src/pages/UserSelectionPage.tsx`** — добавлен ID-бейдж (лаймовый блок слева карточки).

## CSS-переменные темы

```css
--fit-bg:           #0a0a0c   /* фон страниц */
--fit-card:         #18181b   /* карточки */
--fit-card-2:       #1c1c1f   /* вложенные элементы */
--fit-accent:       #a3e635   /* лайм — акцент */
--fit-accent-hover: #84cc16   /* лайм при hover */
--fit-text:         #f4f4f5   /* основной текст */
--fit-muted:        #a1a1aa   /* второстепенный текст */
--fit-border:       #27272a   /* границы */
--fit-danger:       #f87171   /* ошибки/опасность */
```

## Подтверждение выхода из незавершённой тренировки

Файлы:

```
frontend/src/pages/AthleteWorkoutPage.tsx   ← модалка + перехват выхода
frontend/src/pages/AthleteWorkoutPage.css   ← стили модалки (.exit-modal*)
backend/models/WorkoutSession.js            ← новый метод deleteIncomplete()
backend/controllers/logController.js        ← startWorkout удаляет старую незавершённую сессию
```

Как перенести:

1. Замени `frontend/src/pages/AthleteWorkoutPage.tsx` и `AthleteWorkoutPage.css`.
2. Замени `backend/models/WorkoutSession.js` и `backend/controllers/logController.js`.

Поведение:

- При попытке выйти с экрана фиксации подходов (кнопка «назад», системный/жестовый «назад») появляется модалка **«Вы не закончили тренировку»**.
- **«Завершить и оценить»** → переход на экран оценки 👍/👎, тренировка записывается **с эмодзи**.
- **«Продолжить тренировку»** → остаёмся на экране.
- Модалка не показывается, если все упражнения уже отмечены выполненными.
- На бэкенде: при старте новой тренировки старая незавершённая сессия другого дня теперь **удаляется**, а не «добивается» пустым эмодзи — поэтому строки без эмодзи в таблице больше не появляются (включая случай жёсткого закрытия приложения).

> Закрытие/обновление вкладки покажет лишь стандартное браузерное предупреждение, а в Telegram-вебвью оно может не сработать — это ограничение платформы.

## Замена упражнения во время тренировки

Файлы:

```
frontend/src/pages/AthleteWorkoutPage.tsx   ← кнопка «Заменить» + модалка выбора
frontend/src/pages/AthleteWorkoutPage.css   ← стили (.replace-*)
```

Бэкенд **не трогаем** — переиспользуется существующий эндпоинт `GET /exercises?muscleGroup=...`.

Как перенести:

1. Замени `frontend/src/pages/AthleteWorkoutPage.tsx` и `AthleteWorkoutPage.css`.

Поведение:

- На карточке упражнения появляется кнопка **«Заменить упражнение»**.
- Открывается список упражнений **той же группы мышц** (исключая текущее и уже присутствующие в этом дне).
- Выбор подменяет упражнение **только на текущую тренировку** — план тренера не меняется. Цель по подходам/повторам/весу сохраняется, новые подходы пишутся уже под новое упражнение (и попадают в его историю и к тренеру).
- Замена **запрещена**, если по упражнению уже отмечены выполненные подходы (кнопка отключена, показывается подсказка).

> Замена действует в рамках открытого экрана: при обновлении страницы посреди тренировки она сбрасывается — как и обычный прогресс подходов (давнее ограничение приложения).

## Изменения в UserSelectionPage

- **Раньше:** `.user-avatar` показывал инициалы («АФ»), ниже текст «ID: 2»
- **Сейчас:** `.user-avatar` стал лаймовым бейджем «ID:2», имя без лишней строки
- Кнопка «назад» (`←`) в верхнем левом углу, цвет — лайм
- Кнопка «Войти как тренер вместо этого» — убрана
