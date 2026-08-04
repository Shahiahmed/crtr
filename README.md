# ЦРТР CS Tournament

Сайт регистрации команд и жеребьёвки корпоративного турнира Counter-Strike АО «ЦРТР».

## Возможности

- Капитан создаёт команду и получает секретную ссылку управления
- Игроки из справочника — статус «Из справочника»
- Ручной ввод — статус «Вручную» (не подтверждён)
- Основа: 5 игроков, запасные без лимита
- Админ: закрытие регистрации, жеребьёвка, отметка победителей

## Запуск

```bash
npm install
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000).

Админ: `/admin` · логин `admin` · пароль из `.env.local` (`admin2026`).

## Данные

- `data/employees.json` — справочник сотрудников
- Локально команды пишутся в `data/tournament.json`
- На Vercel нужен **Upstash Redis** (файловая система там read-only)

### Vercel + Upstash (обязательно для продакшена)

1. Создай бесплатную Redis БД на [upstash.com](https://upstash.com)
2. Скопируй `UPSTASH_REDIS_REST_URL` и `UPSTASH_REDIS_REST_TOKEN`
3. В Vercel → Project → Settings → Environment Variables добавь оба ключа
4. Redeploy

Без Redis сайт откроется, но регистрация команд на Vercel работать не будет.
