CREATE TABLE IF NOT EXISTS canvases (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  scene_data JSONB NOT NULL DEFAULT '{"elements":[],"appState":{},"files":{}}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NULL,
  due_date DATE NOT NULL,
  due_time TIME NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  canvas_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in_progress', 'done')),
  CONSTRAINT tasks_canvas_id_fkey
    FOREIGN KEY (canvas_id)
    REFERENCES canvases(id)
    ON DELETE SET NULL
);
