CREATE TABLE canvases (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    scene_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    due_time TIME,
    status TEXT NOT NULL DEFAULT 'todo',
    canvas_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tasks_status_check
        CHECK (status IN ('todo', 'in_progress', 'done')),

    CONSTRAINT tasks_canvas_fk
        FOREIGN KEY (canvas_id)
        REFERENCES canvases(id)
        ON DELETE SET NULL
);