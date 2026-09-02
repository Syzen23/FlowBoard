CREATE TABLE canvas_shares (
    id UUID PRIMARY KEY,
    canvas_id UUID NOT NULL UNIQUE,
    token TEXT NOT NULL UNIQUE,
    permission TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT canvas_shares_permission_check
        CHECK (permission IN ('view', 'edit')),
    CONSTRAINT canvas_shares_canvas_id_fkey
        FOREIGN KEY (canvas_id)
        REFERENCES canvases(id)
        ON DELETE CASCADE
);

CREATE INDEX canvas_shares_token_idx
    ON canvas_shares(token);
