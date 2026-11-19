/** Append-only: never edit a migration that has shipped, add a new version instead. */
export const MIGRATIONS: { version: number; statements: string[] }[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        member_until TIMESTAMPTZ,
        banned BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_login_at TIMESTAMPTZ
      )`,
      "CREATE UNIQUE INDEX users_username_key ON users (lower(username))",
      `CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      "CREATE INDEX sessions_user_idx ON sessions (user_id)",
      `CREATE TABLE usage (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        feature TEXT NOT NULL,
        day TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, feature, day)
      )`,
      `CREATE TABLE orders (
        id TEXT PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        plan_id TEXT NOT NULL,
        days INTEGER NOT NULL,
        amount_cents INTEGER NOT NULL DEFAULT 0,
        provider TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        provider_trade_no TEXT UNIQUE,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        paid_at TIMESTAMPTZ
      )`,
      "CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC)",
      `CREATE TABLE redeem_codes (
        code TEXT PRIMARY KEY,
        days INTEGER NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        used_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        used_at TIMESTAMPTZ
      )`,
      `CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        alias TEXT NOT NULL,
        mood TEXT,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'visible',
        like_count INTEGER NOT NULL DEFAULT 0,
        comment_count INTEGER NOT NULL DEFAULT 0,
        report_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      "CREATE INDEX posts_feed_idx ON posts (status, id DESC)",
      "CREATE INDEX posts_user_idx ON posts (user_id, id DESC)",
      `CREATE TABLE comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        alias TEXT NOT NULL,
        is_author BOOLEAN NOT NULL DEFAULT FALSE,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'visible',
        report_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      "CREATE INDEX comments_post_idx ON comments (post_id, id)",
      `CREATE TABLE post_likes (
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (post_id, user_id)
      )`,
      `CREATE TABLE reports (
        id SERIAL PRIMARY KEY,
        target_type TEXT NOT NULL,
        target_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        resolved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (target_type, target_id, user_id)
      )`,
      `CREATE TABLE questions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        is_public BOOLEAN NOT NULL DEFAULT TRUE,
        status TEXT NOT NULL DEFAULT 'pending',
        answer TEXT,
        answered_at TIMESTAMPTZ,
        report_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      "CREATE INDEX questions_status_idx ON questions (status, id DESC)",
    ],
  },
  {
    version: 2,
    statements: [
      "ALTER TABLE posts ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}'",
      "ALTER TABLE posts ADD COLUMN pinned_at TIMESTAMPTZ",
      "CREATE INDEX posts_tags_idx ON posts USING GIN (tags)",
      "CREATE INDEX posts_created_idx ON posts (created_at)",
    ],
  },
];
